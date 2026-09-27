"""Call existing ChatNYC trip services for an Ock trip intent."""

from __future__ import annotations

from datetime import timedelta
from time import time

from app.feeds.realtime import live_store
from app.schemas.place import PlaceIn
from app.schemas.trip import TripCreate
from app.services.google_routes import compute_road_route
from app.services.subway import TripPlanningError, plan_subway_trip
from app.services.trip_intent import TripIntent


def _place(label: str) -> PlaceIn:
    return PlaceIn(query=label, label=label)


async def _transit(intent: TripIntent) -> dict:
    body = TripCreate(
        origin=_place(intent.origin or ""),
        destination=_place(intent.destination or ""),
        arrive_by=intent.when if intent.time_type == "arrive_by" else None,
        depart_at=intent.when if intent.time_type == "depart_at" else None,
    )
    try:
        itinerary = await plan_subway_trip(body)
    except TripPlanningError:
        return {"status": "unavailable", "mode": "transit"}
    if not isinstance(itinerary, dict):
        return {"status": "unavailable", "mode": "transit"}
    route: dict = {"status": "available", "mode": "transit"}
    for source, target in (
        ("duration_seconds", "duration_seconds"),
        ("leave_at", "leave_at"),
        ("arrive_at", "arrive_at"),
        ("summary", "summary"),
    ):
        value = itinerary.get(source)
        if isinstance(value, (str, int)) and value != "":
            route[target] = value
    routes = itinerary.get("routes")
    if isinstance(routes, list):
        route["routes"] = [item for item in routes if isinstance(item, str)]
    snapshot = live_store.snapshot()
    if snapshot.fresh:
        alerts = itinerary.get("alerts") if isinstance(itinerary.get("alerts"), list) else []
        route["mta"] = {
            "status": "available",
            "live": bool(itinerary.get("live")),
            "alerts": [
                {"header": alert.get("header"), "routes": alert.get("routes")}
                for alert in alerts
                if isinstance(alert, dict) and isinstance(alert.get("header"), str)
            ],
        }
    else:
        route["mta"] = {"status": "unavailable"}
    return route


async def plan_for_intent(intent: TripIntent) -> dict:
    mode = intent.mode or "transit"
    if mode == "transit":
        return await _transit(intent)
    depart_at = intent.when if intent.time_type == "depart_at" else None
    result = await compute_road_route(mode, intent.origin or "", intent.destination or "", depart_at)
    if intent.time_type == "arrive_by" and intent.when is not None and result.get("status") == "available":
        duration = result.get("duration_seconds")
        if isinstance(duration, int):
            refined_departure = intent.when - timedelta(seconds=duration)
            if refined_departure.timestamp() > time() + 120:
                refined = await compute_road_route(mode, intent.origin or "", intent.destination or "", refined_departure)
                if refined.get("status") == "available":
                    result = refined
        result = {**result, "requested_arrival": intent.when.isoformat()}
    return result
