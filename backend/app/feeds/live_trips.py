from __future__ import annotations

from operator import itemgetter

from google.transit import gtfs_realtime_pb2

from app.routing import timetable

LiveTrip = tuple[str, str, list[list]]

# a line missing from a feed that loaded fine has no trains running
FEED_ROUTES = {
    "nyct/gtfs": {"1", "2", "3", "4", "5", "6", "6X", "7", "7X", "GS"},
    "nyct/gtfs-ace": {"A", "C", "E", "H", "FS"},
    "nyct/gtfs-bdfm": {"B", "D", "F", "FX", "M"},
    "nyct/gtfs-g": {"G"},
    "nyct/gtfs-jz": {"J", "Z"},
    "nyct/gtfs-nqrw": {"N", "Q", "R", "W"},
    "nyct/gtfs-l": {"L"},
    "nyct/gtfs-si": {"SI"},
}


def collect(payload: bytes, graph, out: list[LiveTrip]) -> None:
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(payload)
    skipped = gtfs_realtime_pb2.TripUpdate.StopTimeUpdate.SKIPPED
    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue
        update = entity.trip_update
        if update.trip.schedule_relationship == gtfs_realtime_pb2.TripDescriptor.CANCELED:
            continue
        route_id = update.trip.route_id or graph.trip_routes.get(update.trip.trip_id, "")
        if not route_id:
            continue
        stops: list[list] = []
        for stop in update.stop_time_update:
            if stop.schedule_relationship == skipped or not stop.stop_id:
                continue
            arrive = int(stop.arrival.time or stop.departure.time)
            depart = int(stop.departure.time or stop.arrival.time)
            if not arrive:
                continue
            parent = graph.parent_of(stop.stop_id)
            if parent is None:
                continue
            if stops and stops[-1][0] == parent:
                stops[-1][2] = max(stops[-1][2], depart)
                continue
            stops.append([parent, arrive, max(arrive, depart)])
        if len(stops) > 1:
            out.append((update.trip.trip_id, route_id, stops))


def build(trips: list[LiveTrip], graph, now: int) -> tuple[tuple, dict[str, tuple[str, str]]]:
    table = timetable.current()
    rows: list[tuple] = []
    info: dict[str, tuple[str, str]] = {}
    for trip_id, route_id, stops in trips:
        key = f"rt:{route_id}:{trip_id}"
        for here, there in zip(stops, stops[1:]):
            if here[2] < now:
                continue
            rows.append((here[2], max(here[2], there[1]), here[0], there[0], key, route_id, True))
        headsign = ""
        if table is not None:
            headsign = table.headsigns.get(timetable.rt_key(trip_id) or "", "")
        if not headsign:
            last = graph.stations.get(stops[-1][0])
            headsign = last.name if last else ""
        info[key] = (headsign, timetable.direction_of(trip_id))
    rows.sort(key=itemgetter(0, 1))
    return tuple(rows), info


def horizon(connections) -> dict[tuple[str, str, str], int]:
    # scheduled hops before the last live one are already covered
    latest: dict[tuple[str, str, str], int] = {}
    for conn in connections:
        key = (conn[2], conn[3], conn[5])
        if conn[0] > latest.get(key, -1):
            latest[key] = conn[0]
    return latest
