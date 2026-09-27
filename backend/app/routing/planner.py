from __future__ import annotations

import logging
from datetime import datetime, timedelta

from app.config import settings
from app.feeds.realtime import live_store
from app.feeds.static_gtfs import Station, TransitGraph
from app.routing import timetable
from app.routing.geocode import TripPlanningError
from app.routing.router import (
    NY,
    _endpoint,
    _haversine_m,
    _iso,
    _itinerary,
    _station_place,
    _walk_leg,
    _walk_seconds,
)

logger = logging.getLogger(__name__)

EXTENDED_SEARCH_HOURS = 8
DIRECTION_WORDS = {"N": "northbound", "S": "southbound"}


def candidates(graph: TransitGraph, lat: float, lon: float) -> list[tuple[Station, int]]:
    ranked = sorted(graph.stations.values(), key=lambda s: _haversine_m(lat, lon, s.lat, s.lon))
    picked = []
    for index, station in enumerate(ranked[: settings.snap_candidates]):
        meters = _haversine_m(lat, lon, station.lat, station.lon)
        if index == 0 or meters <= settings.snap_radius_meters:
            picked.append((station, _walk_seconds(meters)))
    return picked


def plan_timed(
    graph: TransitGraph,
    origin: tuple[str, float, float],
    dest: tuple[str, float, float],
    depart_at: datetime,
    arrive_by: datetime | None,
    buffer_seconds: int,
) -> dict | None:
    table = timetable.current()
    if table is None or table.graph is not graph or not table.trips:
        return None
    origin_label, origin_lat, origin_lon = origin
    dest_label, dest_lat, dest_lon = dest
    starts = candidates(graph, origin_lat, origin_lon)
    ends = candidates(graph, dest_lat, dest_lon)
    snapshot = live_store.snapshot()
    live = snapshot if snapshot.fresh and snapshot.connections else None
    walk_only = _walk_seconds(_haversine_m(origin_lat, origin_lon, dest_lat, dest_lon))
    earliest = int(depart_at.timestamp())

    def search(conns: list[tuple], leave: int) -> timetable.Journey | None:
        return timetable.scan(
            conns,
            {station.id: leave + walk for station, walk in starts},
            {station.id: walk for station, walk in ends},
            table.change_at,
            graph.transfers,
            settings.transfer_weight_seconds,
        )

    leave = earliest
    journey = None
    target = None
    conns: list[tuple] = []
    if arrive_by is not None:
        target = int(arrive_by.timestamp()) - buffer_seconds
        leave, journey, conns = _latest_departure(table, live, search, earliest, target)
    if journey is None:
        for hours in (settings.search_hours, EXTENDED_SEARCH_HOURS):
            conns = timetable.connections(table, leave, leave + hours * 3600, live)
            journey = search(conns, leave)
            if journey is not None:
                break

    if journey is None or walk_only <= journey.arrival - leave:
        if journey is None and walk_only > 2 * 3600:
            raise TripPlanningError("No subway service found in the next few hours", status_code=422)
        if target is not None:
            leave = max(earliest, target - walk_only)
        start = datetime.fromtimestamp(leave, NY)
        end = start + timedelta(seconds=walk_only)
        origin_body = _endpoint(origin_label, origin_lat, origin_lon, starts[0][0])
        dest_body = _endpoint(dest_label, dest_lat, dest_lon, ends[0][0])
        return _itinerary(origin_body, dest_body, [_walk_leg(origin_body, dest_body, start, end)], [], walk_only, False)

    return _journey_itinerary(graph, table, live, snapshot, journey, conns, origin, dest, starts, ends, leave)


def _latest_departure(table, live, search, earliest: int, target: int):
    low = max(earliest, target - settings.search_hours * 3600)
    if low >= target:
        return earliest, None, []
    conns = timetable.connections(table, low, target, live)
    best = search(conns, low)
    if best is None or best.arrival > target:
        return earliest, None, []
    high = target
    while high - low > 60:
        mid = (low + high) // 2
        found = search(conns, mid)
        if found is not None and found.arrival <= target:
            low, best = mid, found
        else:
            high = mid
    return low, best, conns


def _journey_itinerary(graph, table, live, snapshot, journey, conns, origin, dest, starts, ends, leave) -> dict:
    origin_label, origin_lat, origin_lon = origin
    dest_label, dest_lat, dest_lon = dest
    walk_in = dict((s.id, w) for s, w in starts)[journey.origin]
    walk_out = dict((s.id, w) for s, w in ends)[journey.target]
    board_station = graph.stations[journey.origin]
    exit_station = graph.stations[journey.target]
    origin_body = _endpoint(origin_label, origin_lat, origin_lon, board_station)
    dest_body = _endpoint(dest_label, dest_lat, dest_lon, exit_station)

    first = conns[journey.rides[0].board]
    at_station = leave + walk_in
    start = datetime.fromtimestamp(leave, NY)
    legs = [_walk_leg(origin_body, _station_place(board_station), start, start + timedelta(seconds=walk_in))]
    cursor = at_station
    routes = []
    used_live = False

    for index, ride in enumerate(journey.rides):
        board = conns[ride.board]
        alight = conns[ride.alight]
        if index:
            prev = conns[journey.rides[index - 1].alight]
            if prev[3] == board[2]:
                seconds = table.change_at(board[2])
            else:
                seconds = next((s for to, s in graph.transfers.get(prev[3], ()) if to == board[2]), 0)
            legs.append(
                {
                    "type": "transfer",
                    "route": None,
                    "from": _station_place(graph.stations[prev[3]]),
                    "to": _station_place(graph.stations[board[2]]),
                    "departure": _iso(datetime.fromtimestamp(prev[1], NY)),
                    "arrival": _iso(datetime.fromtimestamp(prev[1] + seconds, NY)),
                    "live": False,
                }
            )
            cursor = prev[1] + seconds
        headsign, direction = _trip_details(table, snapshot, board)
        used_live = used_live or board[6]
        routes.append(board[5])
        legs.append(
            {
                "type": "subway",
                "route": graph.route_label(board[5]),
                "from": _station_place(graph.stations[board[2]]),
                "to": _station_place(graph.stations[alight[3]]),
                "departure": _iso(datetime.fromtimestamp(board[0], NY)),
                "arrival": _iso(datetime.fromtimestamp(alight[1], NY)),
                "live": board[6],
                "headsign": headsign,
                "direction": DIRECTION_WORDS.get(direction, ""),
                "stops": ride.hops,
                "wait_seconds": max(0, board[0] - cursor),
                "color": table.colors.get(board[5]),
            }
        )
        cursor = alight[1]

    finish = datetime.fromtimestamp(cursor, NY)
    legs.append(_walk_leg(_station_place(exit_station), dest_body, finish, finish + timedelta(seconds=walk_out)))
    alerts = snapshot.alerts_for(set(routes), graph.route_names) if snapshot.fresh else []
    duration = journey.arrival - leave
    plan = _itinerary(origin_body, dest_body, legs, alerts, duration, used_live)
    plan["leave_at"] = _iso(datetime.fromtimestamp(first[0] - walk_in, NY))
    logger.info(
        "Planned %s -> %s via %s (live=%s)",
        board_station.name,
        exit_station.name,
        "/".join(graph.route_label(r) for r in routes),
        used_live,
    )
    return plan


def _trip_details(table, snapshot, conn) -> tuple[str, str]:
    if conn[6]:
        return snapshot.trips.get(conn[4], ("", ""))
    info = table.trips[conn[4] % 100_000]
    return info.headsign, info.direction


def add_summary(plan: dict, arrive_by: datetime | None = None, buffer_seconds: int | None = None) -> dict:
    # only adds keys, existing ones stay as is
    legs = plan.get("legs") or []
    if not legs:
        return plan
    times = [(datetime.fromisoformat(leg["departure"]), datetime.fromisoformat(leg["arrival"])) for leg in legs]
    breakdown = {"walk_seconds": 0, "ride_seconds": 0, "transfer_seconds": 0, "wait_seconds": 0}
    for index, (leg, (dep, arr)) in enumerate(zip(legs, times)):
        seconds = int((arr - dep).total_seconds())
        leg.setdefault("duration_seconds", seconds)
        bucket = {"walk": "walk_seconds", "subway": "ride_seconds", "transfer": "transfer_seconds"}.get(leg["type"])
        if bucket:
            breakdown[bucket] += seconds
        if index:
            breakdown["wait_seconds"] += max(0, int((dep - times[index - 1][1]).total_seconds()))

    subway = [leg for leg in legs if leg["type"] == "subway"]
    arrive_at = times[-1][1]
    if "leave_at" not in plan:
        leave = times[0][0]
        if subway:
            first = legs.index(subway[0])
            lead = sum(int((arr - dep).total_seconds()) for dep, arr in times[:first])
            leave = max(leave, times[first][0] - timedelta(seconds=lead))
        plan["leave_at"] = _iso(leave)
    plan.setdefault("arrive_at", _iso(arrive_at))
    plan.setdefault("breakdown", breakdown)
    plan.setdefault("transfers", max(0, len(subway) - 1))
    plan.setdefault("routes", [leg["route"] for leg in subway])
    plan.setdefault("title", f"{plan['origin']['label']} to {plan['destination']['label']}")
    plan.setdefault("summary", describe(legs))
    if arrive_by is not None:
        deadline = arrive_by if arrive_by.tzinfo else arrive_by.replace(tzinfo=NY)
        slack = int((deadline - arrive_at).total_seconds())
        plan.setdefault("arrive_by", _iso(deadline))
        plan.setdefault("buffer_seconds", buffer_seconds or 0)
        plan.setdefault("on_time", slack >= 0)
        plan.setdefault("slack_seconds", slack)
    return plan


def describe(legs: list[dict]) -> str:
    rides = [leg for leg in legs if leg["type"] == "subway"]
    if not rides:
        minutes = max(1, round(sum(leg.get("duration_seconds", 0) for leg in legs) / 60))
        return f"Walk {minutes} min"
    parts = [f"the {leg['route']} to {leg['to']['label']}" for leg in rides]
    text = "Take " + parts[0]
    if len(parts) > 1:
        text += ", then " + ", then ".join(parts[1:])
    return text
