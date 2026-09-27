"""Server call to the same Google Routes API the web NextStop client uses."""

from __future__ import annotations

from datetime import datetime, timedelta
from time import time

import httpx

from app.config import settings

_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


def _seconds(value: object) -> int | None:
    if not isinstance(value, str) or not value.endswith("s"):
        return None
    try:
        parsed = int(value[:-1])
    except ValueError:
        return None
    return parsed if parsed > 0 else None


async def compute_road_route(mode: str, origin: str, destination: str, depart_at: datetime | None) -> dict:
    """Return a drive or walk estimate. A failure contains no invented duration."""
    if mode not in {"drive", "walk"} or not settings.google_maps_api_key.strip():
        return {"status": "unavailable", "mode": mode}
    travel_mode = "DRIVE" if mode == "drive" else "WALK"
    body: dict = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": travel_mode,
        "languageCode": "en-US",
        "regionCode": "us",
    }
    if travel_mode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
        if depart_at is not None and depart_at.timestamp() > time() + 120:
            body["departureTime"] = depart_at.isoformat()
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                _ROUTES_URL,
                json=body,
                headers={
                    "X-Goog-Api-Key": settings.google_maps_api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return {"status": "unavailable", "mode": mode}
    routes = payload.get("routes") if isinstance(payload, dict) else None
    route = routes[0] if isinstance(routes, list) and routes else None
    duration = _seconds(route.get("duration")) if isinstance(route, dict) else None
    if duration is None:
        return {"status": "unavailable", "mode": mode}
    result = {"status": "available", "mode": mode, "duration_seconds": duration}
    distance = route.get("distanceMeters") if isinstance(route, dict) else None
    if isinstance(distance, int):
        result["distance_meters"] = distance
    if depart_at is not None:
        result["leave_at"] = depart_at.isoformat()
        result["arrive_at"] = (depart_at + timedelta(seconds=duration)).isoformat()
    return result
