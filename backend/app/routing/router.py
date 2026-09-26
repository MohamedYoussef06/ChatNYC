"""Nearest-station snap, subway Dijkstra, and live first-train overlay."""

from __future__ import annotations

import heapq
import logging
import math
from bisect import bisect_left
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import NY_TZ, settings
from app.feeds.realtime import live_store
from app.feeds.static_gtfs import Station, TransitGraph, get_graph
from app.routing.geocode import TripPlanningError

logger = logging.getLogger(__name__)

NY = ZoneInfo(NY_TZ)
EARTH_RADIUS_M = 6_371_000


@dataclass
class _Came:
    station: str
    route: str
    action: str
    from_station: str
    seconds: int
    route_id: str | None
    prev_key: tuple[str, str] | None


@dataclass
class _LegDraft:
    kind: str
    route_id: str | None
    from_id: str
    to_id: str
    seconds: int
    first_hop_to: str | None


def plan_trip(
    origin_label: str,
    origin_lat: float,
    origin_lon: float,
    dest_label: str,
    dest_lat: float,
    dest_lon: float,
    depart_at: datetime,
    arrive_by: datetime | None = None,
    buffer_seconds: int = 0,
) -> dict:
    graph = _require_graph()
    depart_at = _as_ny(depart_at)
    origin_station, origin_distance = _nearest(graph, origin_lat, origin_lon)
    dest_station, dest_distance = _nearest(graph, dest_lat, dest_lon)
    if origin_distance > settings.max_snap_meters:
        raise TripPlanningError("Origin is outside the NYC subway network")
    if dest_distance > settings.max_snap_meters:
        raise TripPlanningError("Destination is outside the NYC subway network")

    from app.routing.planner import plan_timed

    # timetable first, the graph below is the fallback
    timed = plan_timed(
        graph,
        (origin_label, origin_lat, origin_lon),
        (dest_label, dest_lat, dest_lon),
        depart_at,
        _as_ny(arrive_by) if arrive_by is not None else None,
        buffer_seconds,
    )
    if timed is not None:
        return timed

    origin_body = _endpoint(origin_label, origin_lat, origin_lon, origin_station)
    dest_body = _endpoint(dest_label, dest_lat, dest_lon, dest_station)

    if origin_station.id == dest_station.id:
        seconds = _walk_seconds(_haversine_m(origin_lat, origin_lon, dest_lat, dest_lon))
        arrival = depart_at + timedelta(seconds=seconds)
        leg = _walk_leg(origin_body, dest_body, depart_at, arrival)
        return _itinerary(origin_body, dest_body, [leg], [], seconds, False)

    drafts = _shortest_path(graph, origin_station.id, dest_station.id, settings.transfer_penalty_seconds)
    snapshot = live_store.snapshot()
    legs, used_live, final_arrival = _clock_legs(
        graph,
        drafts,
        origin_body,
        dest_body,
        origin_station,
        dest_station,
        origin_lat,
        origin_lon,
        dest_lat,
        dest_lon,
        depart_at,
        snapshot,
    )
    route_ids = {draft.route_id for draft in drafts if draft.route_id}
    alerts = snapshot.alerts_for(route_ids, graph.route_names) if snapshot.fresh else []
    duration = max(0, int((final_arrival - depart_at).total_seconds()))
    logger.info(
        "Planned %s -> %s (%s legs, live=%s)",
        origin_station.name,
        dest_station.name,
        len(legs),
        used_live,
    )
    return _itinerary(origin_body, dest_body, legs, alerts, duration, used_live)


def ensure_depart_at(moment: datetime | None) -> datetime:
    if moment is None:
        return datetime.now(NY)
    return _as_ny(moment)


def _require_graph() -> TransitGraph:
    try:
        return get_graph()
    except RuntimeError as exc:
        raise TripPlanningError(str(exc), status_code=503) from exc


def _shortest_path(graph: TransitGraph, origin: str, dest: str, penalty: int) -> list[_LegDraft]:
    start = (origin, "")
    nodes = {start: _Came(origin, "", "start", origin, 0, None, None)}
    best: dict[tuple[str, str], int] = {start: 0}
    counter = 0
    heap: list[tuple[int, int, str, str]] = [(0, 0, origin, "")]
    found: tuple[str, str] | None = None
    pops = 0

    while heap:
        cost, _, station, route = heapq.heappop(heap)
        key = (station, route)
        if cost != best.get(key):
            continue
        pops += 1
        if pops > 50000:
            break
        if station == dest:
            found = key
            break

        def relax(
            next_station: str,
            next_route: str,
            action: str,
            seconds: int,
            route_id: str | None,
            from_station: str,
        ) -> None:
            nonlocal counter
            next_cost = cost + seconds
            next_key = (next_station, next_route)
            previous = best.get(next_key)
            if previous is not None and next_cost >= previous:
                return
            best[next_key] = next_cost
            nodes[next_key] = _Came(next_station, next_route, action, from_station, seconds, route_id, key)
            counter += 1
            heapq.heappush(heap, (next_cost, counter, next_station, next_route))

        if route == "":
            for route_id in graph.routes_at.get(station, ()):
                relax(station, route_id, "board", 0, route_id, station)
            for to_id, seconds in graph.transfers.get(station, ()):
                relax(to_id, "", "walk_transfer", seconds, None, station)
        else:
            for edge in graph.rides.get((station, route), ()):
                relax(edge.to_station, route, "ride", edge.seconds, route, station)
            relax(station, "", "unboard", penalty, None, station)
            for to_id, seconds in graph.transfers.get(station, ()):
                relax(to_id, "", "walk_transfer", seconds, None, station)

    if found is None:
        raise TripPlanningError("No subway route between those stations", status_code=422)

    steps: list[_Came] = []
    cursor: tuple[str, str] | None = found
    while cursor is not None:
        node = nodes[cursor]
        if node.action in {"ride", "unboard", "walk_transfer"}:
            steps.append(node)
        cursor = node.prev_key
    steps.reverse()
    drafts = _collapse_transfers(_merge_steps(steps))
    while drafts and drafts[-1].kind == "transfer":
        drafts.pop()
    if not drafts:
        raise TripPlanningError("No subway route between those stations", status_code=422)
    return drafts


def _collapse_transfers(drafts: list[_LegDraft]) -> list[_LegDraft]:
    merged: list[_LegDraft] = []
    for draft in drafts:
        if (
            draft.kind == "transfer"
            and merged
            and merged[-1].kind == "transfer"
            and merged[-1].to_id == draft.from_id
        ):
            merged[-1].to_id = draft.to_id
            merged[-1].seconds += draft.seconds
            continue
        merged.append(draft)
    return merged


def _merge_steps(steps: list[_Came]) -> list[_LegDraft]:
    drafts: list[_LegDraft] = []
    for step in steps:
        if step.action == "ride":
            if (
                drafts
                and drafts[-1].kind == "subway"
                and drafts[-1].route_id == step.route_id
                and drafts[-1].to_id == step.from_station
            ):
                drafts[-1].to_id = step.station
                drafts[-1].seconds += step.seconds
            else:
                drafts.append(
                    _LegDraft("subway", step.route_id, step.from_station, step.station, step.seconds, step.station)
                )
            continue
        if step.action == "unboard":
            drafts.append(_LegDraft("transfer", None, step.station, step.station, step.seconds, None))
            continue
        drafts.append(_LegDraft("transfer", None, step.from_station, step.station, step.seconds, None))
    return drafts


def _clock_legs(
    graph: TransitGraph,
    drafts: list[_LegDraft],
    origin_body: dict,
    dest_body: dict,
    origin_station: Station,
    dest_station: Station,
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    depart_at: datetime,
    snapshot,
) -> tuple[list[dict], bool, datetime]:
    walk_in = _walk_seconds(_haversine_m(origin_lat, origin_lon, origin_station.lat, origin_station.lon))
    arrived_at_station = depart_at + timedelta(seconds=walk_in)
    legs: list[dict] = [
        _walk_leg(origin_body, _station_place(origin_station), depart_at, arrived_at_station)
    ]

    cursor = arrived_at_station
    board_index = 0
    while board_index < len(drafts) and drafts[board_index].kind != "subway":
        draft = drafts[board_index]
        departure = cursor
        arrival = cursor + timedelta(seconds=draft.seconds)
        legs.append(_transfer_leg(graph, draft, departure, arrival, False))
        cursor = arrival
        board_index += 1

    used_live = False
    board_at = cursor
    if board_index < len(drafts):
        first_subway = drafts[board_index]
        if first_subway.route_id and first_subway.first_hop_to:
            scheduled = _next_scheduled(
                graph,
                first_subway.from_id,
                first_subway.first_hop_to,
                first_subway.route_id,
                cursor,
            )
            live_at = None
            if snapshot.fresh:
                stamp = snapshot.next_arrival(
                    first_subway.from_id,
                    first_subway.first_hop_to,
                    first_subway.route_id,
                    int(cursor.timestamp()),
                )
                if stamp is not None:
                    live_at = datetime.fromtimestamp(stamp, tz=NY)
                    used_live = True
            if live_at is not None:
                board_at = live_at
            elif scheduled is not None:
                board_at = scheduled
            if board_at < cursor:
                board_at = cursor

    cursor = board_at
    live_leg = used_live
    for draft in drafts[board_index:]:
        departure = cursor
        arrival = cursor + timedelta(seconds=draft.seconds)
        cursor = arrival
        if draft.kind == "subway":
            legs.append(
                {
                    "type": "subway",
                    "route": graph.route_label(draft.route_id or ""),
                    "from": _station_place(graph.stations[draft.from_id]),
                    "to": _station_place(graph.stations[draft.to_id]),
                    "departure": _iso(departure),
                    "arrival": _iso(arrival),
                    "live": live_leg,
                }
            )
            live_leg = False
        else:
            legs.append(_transfer_leg(graph, draft, departure, arrival, False))

    walk_out = _walk_seconds(_haversine_m(dest_station.lat, dest_station.lon, dest_lat, dest_lon))
    final_arrival = cursor + timedelta(seconds=walk_out)
    legs.append(_walk_leg(_station_place(dest_station), dest_body, cursor, final_arrival))
    return legs, used_live, final_arrival


def _next_scheduled(
    graph: TransitGraph,
    origin_id: str,
    dest_id: str,
    route_id: str,
    after: datetime,
) -> datetime | None:
    times = graph.departures.get((origin_id, dest_id, route_id))
    if not times:
        return None
    local = after.astimezone(NY)
    second_of_day = local.hour * 3600 + local.minute * 60 + local.second
    index = bisect_left(times, second_of_day)
    midnight = local.replace(hour=0, minute=0, second=0, microsecond=0)
    if index < len(times):
        return midnight + timedelta(seconds=times[index])
    return midnight + timedelta(days=1, seconds=times[0])


def _itinerary(origin: dict, destination: dict, legs: list[dict], alerts: list, duration: int, live: bool) -> dict:
    return {
        "origin": origin,
        "destination": destination,
        "legs": legs,
        "alerts": alerts,
        "duration_seconds": duration,
        "live": live,
    }


def _endpoint(label: str, lat: float, lon: float, station: Station) -> dict:
    body = _point(label, lat, lon)
    body["station"] = {
        "id": station.id,
        "name": station.name,
        "lat": station.lat,
        "lon": station.lon,
    }
    return body


def _station_place(station: Station) -> dict:
    return _point(station.name, station.lat, station.lon)


def _point(label: str, lat: float, lon: float) -> dict:
    return {"label": label, "lat": round(lat, 6), "lon": round(lon, 6)}


def _transfer_leg(graph: TransitGraph, draft: _LegDraft, departure: datetime, arrival: datetime, live: bool) -> dict:
    return {
        "type": "transfer",
        "route": None,
        "from": _station_place(graph.stations[draft.from_id]),
        "to": _station_place(graph.stations[draft.to_id]),
        "departure": _iso(departure),
        "arrival": _iso(arrival),
        "live": live,
    }


def _walk_leg(origin: dict, dest: dict, departure: datetime, arrival: datetime) -> dict:
    return {
        "type": "walk",
        "route": None,
        "from": {"label": origin["label"], "lat": origin["lat"], "lon": origin["lon"]},
        "to": {"label": dest["label"], "lat": dest["lat"], "lon": dest["lon"]},
        "departure": _iso(departure),
        "arrival": _iso(arrival),
        "live": False,
    }


def _nearest(graph: TransitGraph, lat: float, lon: float) -> tuple[Station, float]:
    best: Station | None = None
    best_distance = math.inf
    for station in graph.stations.values():
        distance = _haversine_m(lat, lon, station.lat, station.lon)
        if distance < best_distance:
            best = station
            best_distance = distance
    if best is None:
        raise TripPlanningError("Subway data is not loaded", status_code=503)
    return best, best_distance


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _walk_seconds(meters: float) -> int:
    if meters <= 1:
        return 0
    return max(1, int(round(meters / settings.walk_speed_mps)))


def _as_ny(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=NY)
    return moment.astimezone(NY)


def _iso(moment: datetime) -> str:
    return moment.astimezone(NY).isoformat()
