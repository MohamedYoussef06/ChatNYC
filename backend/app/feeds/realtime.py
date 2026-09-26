"""Poll MTA GTFS-Realtime subway feeds into a short-lived in-memory cache."""

from __future__ import annotations

import asyncio
import logging
import time
from bisect import bisect_left
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from google.transit import gtfs_realtime_pb2

from app.config import ALERTS_FEED, SUBWAY_FEEDS, settings
from app.feeds.static_gtfs import current_graph

logger = logging.getLogger(__name__)

USER_AGENT = "divhacks-nyc-trip-planner/0.1"


@dataclass(frozen=True)
class AlertNotice:
    header: str
    routes: tuple[str, ...]


@dataclass
class LiveSnapshot:
    updated_at: float | None = None
    arrivals: dict[tuple[str, str, str], tuple[int, ...]] = field(default_factory=dict)
    alerts: tuple[AlertNotice, ...] = ()

    @property
    def fresh(self) -> bool:
        if self.updated_at is None:
            return False
        ttl = max(90, settings.poll_interval_seconds * 3)
        return (time.time() - self.updated_at) <= ttl

    def next_arrival(self, origin_id: str, dest_id: str, route_id: str, after_ts: int) -> int | None:
        times = self.arrivals.get((origin_id, dest_id, route_id))
        if not times:
            return None
        index = bisect_left(times, after_ts)
        if index >= len(times):
            return None
        return times[index]

    def alerts_for(self, route_ids: set[str], route_names: dict[str, str]) -> list[dict[str, object]]:
        matched: list[dict[str, object]] = []
        seen: set[str] = set()
        for alert in self.alerts:
            hit_labels: list[str] = []
            for informed in alert.routes:
                label = _match_route(informed, route_ids, route_names)
                if label and label not in hit_labels:
                    hit_labels.append(label)
            if not hit_labels or alert.header in seen:
                continue
            seen.add(alert.header)
            matched.append({"header": alert.header, "routes": hit_labels})
            if len(matched) >= 8:
                break
        return matched


class LiveStore:
    def __init__(self) -> None:
        self._snapshot = LiveSnapshot()
        self._warned_missing_key = False

    def snapshot(self) -> LiveSnapshot:
        return self._snapshot

    def publish(self, arrivals: dict[tuple[str, str, str], tuple[int, ...]], alerts: tuple[AlertNotice, ...]) -> None:
        self._snapshot = LiveSnapshot(updated_at=time.time(), arrivals=arrivals, alerts=alerts)

    async def poll_loop(self, stop: asyncio.Event) -> None:
        while not stop.is_set():
            try:
                await self.refresh()
            except Exception:
                logger.exception("GTFS-Realtime poll failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=settings.poll_interval_seconds)
            except TimeoutError:
                continue

    async def refresh(self) -> None:
        if not settings.mta_api_key.strip():
            if not self._warned_missing_key:
                logger.warning("MTA_API_KEY is not set; trip plans use the static schedule only")
                self._warned_missing_key = True
            return
        graph = current_graph()
        if graph is None:
            logger.warning("Skipping realtime poll until static GTFS is loaded")
            return

        headers = {"x-api-key": settings.mta_api_key.strip(), "User-Agent": USER_AGENT}
        arrival_lists: dict[tuple[str, str, str], list[int]] = defaultdict(list)
        subway_ok = False
        alerts_ok = False
        alerts: tuple[AlertNotice, ...] = self._snapshot.alerts
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=headers) as client:
            for feed in SUBWAY_FEEDS:
                try:
                    payload = await _fetch_feed(client, feed)
                    _parse_trip_updates(payload, graph, arrival_lists)
                    subway_ok = True
                except Exception:
                    logger.warning("Subway feed %s failed", feed, exc_info=True)
            try:
                payload = await _fetch_feed(client, ALERTS_FEED)
                alerts = _parse_alerts(payload)
                alerts_ok = True
            except Exception:
                logger.warning("Alerts feed failed", exc_info=True)

        if not subway_ok:
            logger.warning("No subway realtime feeds succeeded; keeping the previous cache")
            return
        if not alerts_ok:
            alerts = self._snapshot.alerts
        now = int(time.time()) - 30
        cleaned: dict[tuple[str, str, str], tuple[int, ...]] = {}
        for key, values in arrival_lists.items():
            stamps = sorted({stamp for stamp in values if stamp >= now})
            if stamps:
                cleaned[key] = tuple(stamps[:30])
        self.publish(cleaned, alerts)
        logger.info("Realtime cache updated: %s directed arrivals, %s alerts", len(cleaned), len(alerts))


live_store = LiveStore()


def _feed_url(path: str) -> str:
    # api.mta.info documents the feed id with an encoded slash: nyct%2Fgtfs.
    encoded = path.strip("/").replace("/", "%2F")
    return f"{settings.mta_feed_base.rstrip('/')}/{encoded}"


async def _fetch_feed(client: httpx.AsyncClient, path: str) -> bytes:
    response = await client.get(_feed_url(path))
    response.raise_for_status()
    return response.content


def _parse_trip_updates(payload: bytes, graph, arrival_lists: dict[tuple[str, str, str], list[int]]) -> None:
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(payload)
    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue
        trip_update = entity.trip_update
        if trip_update.trip.schedule_relationship == gtfs_realtime_pb2.TripDescriptor.CANCELED:
            continue
        route_id = trip_update.trip.route_id or graph.trip_routes.get(trip_update.trip.trip_id, "")
        if not route_id:
            continue
        skipped = gtfs_realtime_pb2.TripUpdate.StopTimeUpdate.SKIPPED
        stops: list[tuple[str, int]] = []
        for update in trip_update.stop_time_update:
            if update.schedule_relationship == skipped:
                continue
            stamp = _event_time(update)
            if not update.stop_id or stamp is None:
                continue
            parent = graph.parent_of(update.stop_id)
            if parent is None:
                continue
            if stops and stops[-1][0] == parent:
                continue
            stops.append((parent, stamp))
        for index in range(len(stops) - 1):
            origin_id, stamp = stops[index]
            last = min(len(stops), index + 7)
            for follow in range(index + 1, last):
                dest_id = stops[follow][0]
                arrival_lists[(origin_id, dest_id, route_id)].append(stamp)


def _event_time(update) -> int | None:
    if update.arrival.time:
        return int(update.arrival.time)
    if update.departure.time:
        return int(update.departure.time)
    return None


def _parse_alerts(payload: bytes) -> tuple[AlertNotice, ...]:
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(payload)
    graph = current_graph()
    notices: list[AlertNotice] = []
    seen: set[str] = set()
    for entity in feed.entity:
        if not entity.HasField("alert"):
            continue
        alert = entity.alert
        header = _translated(alert.header_text) or _translated(alert.description_text)
        header = " ".join(header.split())
        if not header or header in seen:
            continue
        routes = tuple(
            dict.fromkeys(
                token
                for informed in alert.informed_entity
                if (token := _subway_route_token(informed.route_id, informed.agency_id, graph))
            )
        )
        if not routes:
            continue
        seen.add(header)
        notices.append(AlertNotice(header, routes))
    return tuple(notices)


_NON_SUBWAY_AGENCIES = {"MTABC", "MTA BUS", "LI", "LIRR", "MNR", "METRO-NORTH"}


def _subway_route_token(route_id: str, agency_id: str, graph) -> str | None:
    """Keep NYCT subway routes. Bus, LIRR, and Metro-North entities are dropped."""
    token = (route_id or "").strip()
    if not token:
        return None
    if ":" in token:
        token = token.split(":")[-1].strip()
    agency = (agency_id or "").strip().upper()
    if agency in _NON_SUBWAY_AGENCIES:
        return None
    if graph is None:
        return token
    if token in graph.route_names or token in graph.route_names.values():
        return token
    for known, label in graph.route_names.items():
        if token.endswith("_" + known) or token.endswith("_" + label):
            return known
    return None


def _translated(message) -> str:
    if message is None:
        return ""
    english = ""
    fallback = ""
    for translation in message.translation:
        if not fallback and translation.text:
            fallback = translation.text
        if translation.language in {"en", "en-us", "en-US"} and translation.text:
            english = translation.text
            break
    return english or fallback


def _match_route(informed: str, route_ids: set[str], route_names: dict[str, str]) -> str | None:
    token = informed.strip()
    if ":" in token:
        token = token.split(":")[-1]
    for route_id in route_ids:
        label = route_names.get(route_id) or route_id
        if token in {route_id, label} or token.endswith("_" + route_id) or token.endswith("_" + label):
            return label
    return None


def updated_at_iso(snapshot: LiveSnapshot) -> str | None:
    if snapshot.updated_at is None:
        return None
    return datetime.fromtimestamp(snapshot.updated_at, tz=timezone.utc).isoformat()
