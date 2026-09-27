"""Load MTA subway GTFS into an in-memory station graph."""

from __future__ import annotations

import csv
import io
import logging
import time
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx

from app.config import DATA_DIR, NY_TZ, settings

logger = logging.getLogger(__name__)

NY = ZoneInfo(NY_TZ)
ZIP_NAME = "google_transit.zip"
MAX_ZIP_AGE_SECONDS = 24 * 60 * 60
USER_AGENT = "divhacks-nyc-trip-planner/0.1"


@dataclass(frozen=True)
class Station:
    id: str
    name: str
    lat: float
    lon: float


@dataclass(frozen=True)
class RideEdge:
    to_station: str
    seconds: int


@dataclass
class TransitGraph:
    stations: dict[str, Station] = field(default_factory=dict)
    rides: dict[tuple[str, str], list[RideEdge]] = field(default_factory=dict)
    routes_at: dict[str, set[str]] = field(default_factory=dict)
    transfers: dict[str, list[tuple[str, int]]] = field(default_factory=dict)
    departures: dict[tuple[str, str, str], list[int]] = field(default_factory=dict)
    route_names: dict[str, str] = field(default_factory=dict)
    stop_to_parent: dict[str, str] = field(default_factory=dict)
    trip_routes: dict[str, str] = field(default_factory=dict)

    def parent_of(self, stop_id: str) -> str | None:
        parent = self.stop_to_parent.get(stop_id)
        if parent is None or parent not in self.stations:
            return None
        return parent

    def route_label(self, route_id: str) -> str:
        return self.route_names.get(route_id) or route_id

    def search(self, query: str, limit: int = 20) -> list[Station]:
        stations = list(self.stations.values())
        needle = query.strip().lower()
        if not needle:
            stations.sort(key=lambda station: station.name)
            return stations[:limit]
        starts = [station for station in stations if station.name.lower().startswith(needle)]
        contains = [
            station
            for station in stations
            if needle in station.name.lower() and station not in starts
        ]
        starts.sort(key=lambda station: station.name)
        contains.sort(key=lambda station: station.name)
        return (starts + contains)[:limit]


_graph: TransitGraph | None = None
_load_error: str | None = None


def get_graph() -> TransitGraph:
    if _graph is None:
        raise RuntimeError(_load_error or "Subway data is not loaded")
    return _graph


def current_graph() -> TransitGraph | None:
    return _graph


def load_error() -> str | None:
    return _load_error


def load() -> None:
    global _graph, _load_error
    try:
        graph = _build_graph(_ensure_zip())
    except Exception as exc:
        _load_error = f"Failed to load subway GTFS: {exc}"
        logger.exception("static GTFS load failed")
        return
    _graph = graph
    _load_error = None
    logger.info(
        "Loaded subway graph: %s stations, %s route-stop edges",
        len(graph.stations),
        sum(len(edges) for edges in graph.rides.values()),
    )


def _ensure_zip():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / ZIP_NAME
    fresh = dest.exists() and (time.time() - dest.stat().st_mtime) < MAX_ZIP_AGE_SECONDS
    if fresh and _zip_is_valid(dest):
        return dest
    urls = [settings.gtfs_static_url]
    https = settings.gtfs_static_url.replace("http://", "https://", 1)
    if https not in urls:
        urls.append(https)
    last_error: Exception | None = None
    for url in urls:
        try:
            _download(url, dest)
            return dest
        except Exception as exc:
            last_error = exc
            logger.warning("GTFS download failed for %s: %s", url, exc)
    if dest.exists() and _zip_is_valid(dest):
        logger.warning("Using previously cached GTFS zip")
        return dest
    raise RuntimeError(f"Could not download subway GTFS: {last_error}")


def _download(url: str, dest) -> None:
    partial = dest.with_suffix(".zip.part")
    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(timeout=90, follow_redirects=True, headers=headers) as client:
        response = client.get(url)
        response.raise_for_status()
        partial.write_bytes(response.content)
    if not _zip_is_valid(partial):
        partial.unlink(missing_ok=True)
        raise RuntimeError(f"Download from {url} was not a zip file")
    partial.replace(dest)
    logger.info("Saved GTFS zip (%s bytes) from %s", dest.stat().st_size, url)


def _zip_is_valid(path) -> bool:
    try:
        with zipfile.ZipFile(path) as archive:
            return any(name.endswith("stops.txt") for name in archive.namelist())
    except zipfile.BadZipFile:
        return False


def _build_graph(zip_path) -> TransitGraph:
    with zipfile.ZipFile(zip_path) as archive:
        return _assemble_graph(
            _read_table(archive, "stops.txt"),
            _read_table(archive, "routes.txt"),
            _read_table(archive, "trips.txt"),
            _read_table(archive, "calendar.txt"),
            _read_table(archive, "calendar_dates.txt"),
            _read_table(archive, "transfers.txt"),
            archive,
        )


def _assemble_graph(stops_rows, route_rows, trip_rows, calendar_rows, calendar_date_rows, transfer_rows, archive) -> TransitGraph:
    graph = TransitGraph()
    for row in stops_rows:
        stop_id = row["stop_id"].strip()
        parent = (row.get("parent_station") or "").strip()
        location_type = (row.get("location_type") or "").strip()
        if location_type == "1" or not parent:
            graph.stop_to_parent[stop_id] = stop_id
        else:
            graph.stop_to_parent[stop_id] = parent
        if location_type != "1":
            continue
        try:
            lat = float(row["stop_lat"])
            lon = float(row["stop_lon"])
        except (TypeError, ValueError, KeyError):
            continue
        name = (row.get("stop_name") or stop_id).strip()
        graph.stations[stop_id] = Station(stop_id, name, lat, lon)

    for row in route_rows:
        route_id = row["route_id"].strip()
        short = (row.get("route_short_name") or "").strip() or route_id
        graph.route_names[route_id] = short

    active_services = _active_services(calendar_rows, calendar_date_rows, datetime.now(NY).date())
    active_trips: dict[str, str] = {}
    for row in trip_rows:
        trip_id = row["trip_id"].strip()
        route_id = row["route_id"].strip()
        if not route_id:
            continue
        graph.trip_routes[trip_id] = route_id
        service_id = row.get("service_id", "").strip()
        if not active_services or service_id in active_services:
            active_trips[trip_id] = route_id
    if not active_trips:
        logger.warning("No trips matched today's subway service; using every trip in the feed")
        active_trips = dict(graph.trip_routes)

    by_trip: dict[str, list[tuple[int, str, int]]] = defaultdict(list)
    stop_time_handle = _open_reader(archive, "stop_times.txt")
    try:
        for row in csv.DictReader(stop_time_handle):
            trip_id = row["trip_id"].strip()
            if trip_id not in active_trips:
                continue
            stop_id = (row.get("stop_id") or "").strip()
            clock = (row.get("departure_time") or row.get("arrival_time") or "").strip()
            if not stop_id or not clock:
                continue
            try:
                sequence = int(row["stop_sequence"])
                seconds = _parse_gtfs_clock(clock)
            except (TypeError, ValueError):
                continue
            by_trip[trip_id].append((sequence, stop_id, seconds))
    finally:
        stop_time_handle.close()

    edge_seconds: dict[tuple[str, str, str], int] = {}
    departure_sets: dict[tuple[str, str, str], set[int]] = defaultdict(set)
    for trip_id, events in by_trip.items():
        route_id = active_trips[trip_id]
        events.sort(key=lambda item: item[0])
        collapsed: list[tuple[str, int]] = []
        for _sequence, stop_id, seconds in events:
            parent = graph.stop_to_parent.get(stop_id)
            if parent is None or parent not in graph.stations:
                continue
            if collapsed and collapsed[-1][0] == parent:
                continue
            collapsed.append((parent, seconds))
        for index in range(len(collapsed) - 1):
            origin_id, depart = collapsed[index]
            dest_id, arrive = collapsed[index + 1]
            travel = arrive - depart
            if travel <= 0:
                travel = 60
            key = (origin_id, dest_id, route_id)
            previous = edge_seconds.get(key)
            if previous is None or travel < previous:
                edge_seconds[key] = travel
            departure_sets[key].add(depart % 86400)

    rides: dict[tuple[str, str], list[RideEdge]] = defaultdict(list)
    routes_at: dict[str, set[str]] = defaultdict(set)
    for (origin_id, dest_id, route_id), seconds in edge_seconds.items():
        rides[(origin_id, route_id)].append(RideEdge(dest_id, seconds))
        routes_at[origin_id].add(route_id)
    graph.rides = dict(rides)
    graph.routes_at = {station_id: set(routes) for station_id, routes in routes_at.items()}
    graph.departures = {key: sorted(times) for key, times in departure_sets.items()}

    transfer_seconds: dict[tuple[str, str], int] = {}
    penalty = settings.transfer_penalty_seconds
    for row in transfer_rows:
        if (row.get("transfer_type") or "").strip() == "3":
            continue
        from_parent = graph.parent_of((row.get("from_stop_id") or "").strip())
        to_parent = graph.parent_of((row.get("to_stop_id") or "").strip())
        if not from_parent or not to_parent or from_parent == to_parent:
            continue
        raw = (row.get("min_transfer_time") or "").strip()
        try:
            seconds = int(raw) if raw else penalty
        except ValueError:
            seconds = penalty
        if seconds <= 0:
            seconds = penalty
        key = (from_parent, to_parent)
        previous = transfer_seconds.get(key)
        if previous is None or seconds < previous:
            transfer_seconds[key] = seconds
    transfers: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for (origin_id, dest_id), seconds in transfer_seconds.items():
        transfers[origin_id].append((dest_id, seconds))
    graph.transfers = dict(transfers)
    return graph


def _open_reader(archive: zipfile.ZipFile, name: str) -> io.TextIOWrapper:
    member = _member_name(archive, name)
    if member is None:
        raise RuntimeError(f"{name} is missing from the GTFS zip")
    raw = archive.open(member)
    return io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")


def _active_services(calendar_rows: list[dict[str, str]], date_rows: list[dict[str, str]], today: date) -> set[str]:
    weekday_fields = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    field_name = weekday_fields[today.weekday()]
    active: set[str] = set()
    for row in calendar_rows:
        try:
            start = _parse_yyyymmdd(row["start_date"])
            end = _parse_yyyymmdd(row["end_date"])
        except (KeyError, ValueError):
            continue
        if start <= today <= end and (row.get(field_name) or "").strip() == "1":
            active.add(row["service_id"].strip())
    today_key = today.strftime("%Y%m%d")
    for row in date_rows:
        if (row.get("date") or "").strip() != today_key:
            continue
        service_id = (row.get("service_id") or "").strip()
        exception = (row.get("exception_type") or "").strip()
        if exception == "1":
            active.add(service_id)
        elif exception == "2":
            active.discard(service_id)
    return active


def _read_table(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    member = _member_name(archive, name)
    if member is None:
        if name in {"calendar.txt", "calendar_dates.txt", "transfers.txt"}:
            return []
        raise RuntimeError(f"{name} is missing from the GTFS zip")
    with archive.open(member) as handle:
        text = io.TextIOWrapper(handle, encoding="utf-8-sig", newline="")
        try:
            return list(csv.DictReader(text))
        finally:
            text.detach()


def _member_name(archive: zipfile.ZipFile, name: str) -> str | None:
    matches = [
        entry
        for entry in archive.namelist()
        if entry.endswith(name) and not entry.startswith("__MACOSX")
    ]
    if not matches:
        return None
    matches.sort(key=len)
    return matches[0]


def _parse_gtfs_clock(value: str) -> int:
    hours, minutes, seconds = value.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds)


def _parse_yyyymmdd(value: str) -> date:
    raw = value.strip()
    return date(int(raw[0:4]), int(raw[4:6]), int(raw[6:8]))
