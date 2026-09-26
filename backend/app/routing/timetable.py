from __future__ import annotations

import asyncio
import csv
import logging
import re
import threading
import zipfile
from array import array
from bisect import bisect_left, bisect_right
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time as dtime, timedelta
from operator import itemgetter
from pathlib import Path

from app.config import DATA_DIR, settings
from app.feeds import static_gtfs
from app.feeds.static_gtfs import (
    NY,
    ZIP_NAME,
    TransitGraph,
    _active_services,
    _member_name,
    _open_reader,
    _parse_gtfs_clock,
    _read_table,
    _zip_is_valid,
)

logger = logging.getLogger(__name__)

BUNDLED_DIR = DATA_DIR / "google_transit"
MAX_LEGS = 5
_RT_KEY = re.compile(r"(\d{6}_[A-Za-z0-9]+\.\.[NS])")
_DIRECTION = re.compile(r"\.{1,2}([NS])")
_by_conn_time = itemgetter(0, 1)


@dataclass(frozen=True)
class TripInfo:
    trip_id: str
    route_id: str
    service_id: str
    headsign: str
    direction: str


@dataclass
class DayTable:
    deps: array
    arrs: array
    frm: list[str]
    to: list[str]
    trips: array


@dataclass
class Timetable:
    graph: TransitGraph
    trips: list[TripInfo] = field(default_factory=list)
    stops: list[tuple[str, ...]] = field(default_factory=list)
    times: list[array] = field(default_factory=list)
    calendar: list[dict[str, str]] = field(default_factory=list)
    calendar_dates: list[dict[str, str]] = field(default_factory=list)
    change_seconds: dict[str, int] = field(default_factory=dict)
    colors: dict[str, str] = field(default_factory=dict)
    headsigns: dict[str, str] = field(default_factory=dict)
    days: dict[date, DayTable] = field(default_factory=dict)
    built_on: date | None = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    def change_at(self, station: str) -> int:
        return self.change_seconds.get(station, settings.transfer_penalty_seconds)

    def day(self, day: date) -> DayTable:
        with self.lock:
            table = self.days.get(day)
            if table is None:
                table = _build_day(self, day)
                if len(self.days) >= 4:
                    self.days.pop(next(iter(self.days)))
                self.days[day] = table
            return table


_timetable: Timetable | None = None


def current() -> Timetable | None:
    return _timetable


def rt_key(trip_id: str) -> str | None:
    match = _RT_KEY.search(trip_id)
    return match.group(1) if match else None


def direction_of(trip_id: str, direction_id: str = "") -> str:
    match = _DIRECTION.search(trip_id)
    if match:
        return match.group(1)
    return {"0": "N", "1": "S"}.get(direction_id.strip(), "")


def load(graph: TransitGraph | None) -> None:
    global _timetable
    if graph is None or not graph.stop_to_parent:
        return
    source = DATA_DIR / ZIP_NAME
    if not (source.exists() and _zip_is_valid(source)):
        source = BUNDLED_DIR
        if not (source / "stops.txt").exists():
            logger.warning("No GTFS source for the timetable, using the station graph only")
            return
    try:
        table = _read_timetable(graph, source)
    except Exception:
        logger.exception("Timetable load failed")
        return
    table.built_on = datetime.now(NY).date()
    table.day(table.built_on)
    _timetable = table
    logger.info("Timetable ready: %s trips", len(table.trips))


def after_load() -> None:
    if static_gtfs.current_graph() is None and (BUNDLED_DIR / "stops.txt").exists():
        try:
            with FolderArchive(BUNDLED_DIR) as archive:
                graph = static_gtfs._assemble_graph(
                    _read_table(archive, "stops.txt"),
                    _read_table(archive, "routes.txt"),
                    _read_table(archive, "trips.txt"),
                    _read_table(archive, "calendar.txt"),
                    _read_table(archive, "calendar_dates.txt"),
                    _read_table(archive, "transfers.txt"),
                    archive,
                )
        except Exception:
            logger.exception("Bundled GTFS folder failed to load")
        else:
            static_gtfs._graph = graph
            static_gtfs._load_error = None
            logger.warning("MTA download failed, using the GTFS copy in data/google_transit")
    load(static_gtfs.current_graph())


async def daily_reload(stop: asyncio.Event) -> None:
    # the graph only has today's service
    while True:
        try:
            await asyncio.wait_for(stop.wait(), timeout=900)
            return
        except TimeoutError:
            pass
        table = _timetable
        if table is not None and table.built_on == datetime.now(NY).date():
            continue
        logger.info("New service day, reloading GTFS")
        await asyncio.to_thread(static_gtfs.load)
        await asyncio.to_thread(after_load)


def open_source(path: Path):
    if path.is_dir():
        return FolderArchive(path)
    return zipfile.ZipFile(path)


class FolderArchive:
    # enough of ZipFile to read an unzipped GTFS folder

    def __init__(self, root: Path) -> None:
        self.root = root

    def namelist(self) -> list[str]:
        return [entry.name for entry in self.root.iterdir() if entry.is_file()]

    def open(self, name: str):
        return (self.root / name).open("rb")

    def __enter__(self):
        return self

    def __exit__(self, *exc) -> None:
        return None


def _read_timetable(graph: TransitGraph, source: Path) -> Timetable:
    table = Timetable(graph)
    with open_source(source) as archive:
        trip_rows = _read_table(archive, "trips.txt")
        table.calendar = _read_table(archive, "calendar.txt")
        table.calendar_dates = _read_table(archive, "calendar_dates.txt")
        for row in _read_table(archive, "routes.txt"):
            color = (row.get("route_color") or "").strip()
            if color:
                table.colors[row["route_id"].strip()] = "#" + color.lstrip("#")
        for row in _read_table(archive, "transfers.txt"):
            start = graph.parent_of((row.get("from_stop_id") or "").strip())
            end = graph.parent_of((row.get("to_stop_id") or "").strip())
            raw = (row.get("min_transfer_time") or "").strip()
            if start and start == end and raw.isdigit() and int(raw) > 0:
                table.change_seconds[start] = min(int(raw), table.change_seconds.get(start, 10**6))

        meta: dict[str, TripInfo] = {}
        for row in trip_rows:
            trip_id = row["trip_id"].strip()
            route_id = row["route_id"].strip()
            if not route_id:
                continue
            meta[trip_id] = TripInfo(
                trip_id,
                route_id,
                (row.get("service_id") or "").strip(),
                (row.get("trip_headsign") or "").strip(),
                direction_of(trip_id, row.get("direction_id") or ""),
            )

        events: dict[str, list[tuple[int, str, int, int]]] = defaultdict(list)
        handle = _open_reader(archive, "stop_times.txt")
        try:
            for row in csv.DictReader(handle):
                trip_id = row["trip_id"].strip()
                if trip_id not in meta:
                    continue
                depart_clock = (row.get("departure_time") or row.get("arrival_time") or "").strip()
                arrive_clock = (row.get("arrival_time") or "").strip() or depart_clock
                if not depart_clock:
                    continue
                try:
                    events[trip_id].append(
                        (
                            int(row["stop_sequence"]),
                            (row.get("stop_id") or "").strip(),
                            _parse_gtfs_clock(arrive_clock),
                            _parse_gtfs_clock(depart_clock),
                        )
                    )
                except (TypeError, ValueError):
                    continue
        finally:
            handle.close()

    for trip_id, rows in events.items():
        rows.sort(key=itemgetter(0))
        stops: list[str] = []
        times = array("i")
        for _seq, stop_id, arrive, depart in rows:
            parent = graph.parent_of(stop_id)
            if parent is None:
                continue
            if stops and stops[-1] == parent:
                times[-1] = depart
                continue
            stops.append(parent)
            times.append(arrive)
            times.append(max(arrive, depart))
        if len(stops) < 2:
            continue
        info = meta[trip_id]
        table.trips.append(info)
        table.stops.append(tuple(stops))
        table.times.append(times)
        key = rt_key(trip_id)
        if key and info.headsign:
            table.headsigns.setdefault(key, info.headsign)
    return table


def _services_for(table: Timetable, day: date) -> set[str] | None:
    active = _active_services(table.calendar, table.calendar_dates, day)
    if active:
        return active
    # old bundled copy doesn't cover this date, use the same weekday
    weekday = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")[day.weekday()]
    active = {row["service_id"].strip() for row in table.calendar if (row.get(weekday) or "").strip() == "1"}
    return active or None


def _build_day(table: Timetable, day: date) -> DayTable:
    services = _services_for(table, day)
    rows: list[tuple[int, int, str, str, int]] = []
    for index, info in enumerate(table.trips):
        if services is not None and info.service_id not in services:
            continue
        stops = table.stops[index]
        times = table.times[index]
        for hop in range(len(stops) - 1):
            depart = times[2 * hop + 1]
            arrive = max(depart, times[2 * hop + 2])
            rows.append((depart, arrive, stops[hop], stops[hop + 1], index))
    rows.sort(key=_by_conn_time)
    return DayTable(
        array("i", (row[0] for row in rows)),
        array("i", (row[1] for row in rows)),
        [row[2] for row in rows],
        [row[3] for row in rows],
        array("i", (row[4] for row in rows)),
    )


def service_base(day: date) -> int:
    # GTFS counts from noon minus 12h so DST days work
    noon = datetime.combine(day, dtime(12), NY)
    return int((noon - timedelta(hours=12)).timestamp())


def connections(table: Timetable, start_ts: int, end_ts: int, live=None) -> list[tuple]:
    horizon = live.horizon if live is not None else {}
    covered = live.covered if live is not None else frozenset()
    live_at = int(live.updated_at or 0) if live is not None else 0
    rows: list[tuple] = []
    day = datetime.fromtimestamp(start_ts, NY).date() - timedelta(days=1)
    last = datetime.fromtimestamp(end_ts, NY).date()
    while day <= last:
        hops = table.day(day)
        base = service_base(day)
        tag = day.toordinal() * 100_000
        lo = bisect_left(hops.deps, start_ts - base)
        hi = bisect_right(hops.deps, end_ts - base)
        for i in range(lo, hi):
            depart = base + hops.deps[i]
            trip = hops.trips[i]
            route = table.trips[trip].route_id
            frm = hops.frm[i]
            to = hops.to[i]
            if horizon and depart <= horizon.get((frm, to, route), -1):
                continue
            # already left its terminal but isn't in the live feed, so it isn't running
            if route in covered and base + table.times[trip][1] <= live_at:
                continue
            rows.append((depart, base + hops.arrs[i], frm, to, tag + trip, route, False))
        day += timedelta(days=1)
    if live is not None:
        rows.extend(c for c in live.connections if start_ts <= c[0] <= end_ts)
    rows.sort(key=_by_conn_time)
    return rows


@dataclass
class Ride:
    board: int
    alight: int
    hops: int


@dataclass
class Journey:
    arrival: int
    score: int
    origin: str
    target: str
    rides: list[Ride]


def scan(
    conns: list[tuple],
    sources: dict[str, int],
    targets: dict[str, int],
    change_at,
    footpaths: dict[str, list[tuple[str, int]]],
    transfer_weight: int = 0,
    max_legs: int = MAX_LEGS,
) -> Journey | None:
    # CSA in rounds, round k is journeys with exactly k trains
    # sources: station to ready time, targets: station to walk seconds
    if not conns or not sources:
        return None
    first = bisect_left(conns, min(sources.values()), key=itemgetter(0))
    ready = dict(sources)
    rounds: list[tuple[dict, dict]] = []
    best: tuple[int, int, int, str] | None = None
    cutoff = float("inf")

    for legs in range(1, max_legs + 1):
        boarded: dict = {}
        arrived: dict[str, tuple[int, int, int]] = {}
        for i in range(first, len(conns)):
            conn = conns[i]
            if conn[0] > cutoff:
                break
            trip = conn[4]
            if trip not in boarded:
                at = ready.get(conn[2])
                if at is None or at > conn[0]:
                    continue
                boarded[trip] = i
            seen = arrived.get(conn[3])
            if seen is None or conn[1] < seen[0]:
                arrived[conn[3]] = (conn[1], boarded[trip], i)

        came: dict[str, str] = {}
        nxt: dict[str, int] = {}
        for station, (arr, _board, _alight) in arrived.items():
            at = arr + change_at(station)
            if at < nxt.get(station, cutoff):
                nxt[station] = at
                came[station] = station
            for other, seconds in footpaths.get(station, ()):
                at = arr + seconds
                if at < nxt.get(other, cutoff):
                    nxt[other] = at
                    came[other] = station
        rounds.append((arrived, came))

        for station, walk in targets.items():
            hit = arrived.get(station)
            if hit is None:
                continue
            total = hit[0] + walk
            score = total + transfer_weight * (legs - 1)
            if best is None or score < best[0]:
                best = (score, total, legs, station)
            cutoff = min(cutoff, total)
        if not nxt:
            break
        ready = nxt

    if best is None:
        return None
    score, total, legs, station = best
    rides: list[Ride] = []
    while True:
        _arr, board, alight = rounds[legs - 1][0][station]
        trip = conns[board][4]
        hops = sum(1 for i in range(board, alight + 1) if conns[i][4] == trip)
        rides.append(Ride(board, alight, hops))
        if legs == 1:
            break
        station = rounds[legs - 2][1][conns[board][2]]
        legs -= 1
    rides.reverse()
    return Journey(total, score, conns[rides[0].board][2], best[3], rides)
