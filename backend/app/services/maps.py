"""Multimodal routing via Google Directions when MAPS_API_KEY is set, else estimates."""

from __future__ import annotations

from typing import Any, Literal

import httpx

from app.config import settings

TravelMode = Literal["walking", "driving", "transit"]

MODES: tuple[TravelMode, ...] = ("walking", "driving", "transit")

# Best-effort NYC estimates for the demo Brooklyn corridor when no maps key is set.
_ESTIMATES: dict[TravelMode, dict[str, Any]] = {
    "walking": {
        "duration_minutes": 28,
        "distance_meters": 2100,
        "cost_usd": 0.0,
        "transfers": 0,
        "wait_minutes": 0,
        "ease_score": 7,
        "summary": "Walk via Flatbush Ave / Park Place (~28 min, free).",
    },
    "driving": {
        "duration_minutes": 12,
        "distance_meters": 2400,
        "cost_usd": 8.5,
        "transfers": 0,
        "wait_minutes": 0,
        "ease_score": 6,
        "summary": "Drive via Flatbush Ave (~12 min; parking/tolls ~$8–10).",
    },
    "transit": {
        "duration_minutes": 18,
        "distance_meters": 2600,
        "cost_usd": 2.9,
        "transfers": 0,
        "wait_minutes": 4,
        "ease_score": 8,
        "summary": "B/Q toward Prospect Park (~18 min door-to-door, 1 seat, ~4 min wait).",
    },
}


def _estimate_route(mode: TravelMode, origin: str, destination: str) -> dict[str, Any]:
    base = _ESTIMATES[mode]
    return {
        "mode": mode,
        "duration_minutes": base["duration_minutes"],
        "distance_meters": base["distance_meters"],
        "cost_usd": base["cost_usd"],
        "transfers": base["transfers"],
        "wait_minutes": base["wait_minutes"],
        "ease_score": base["ease_score"],
        "summary": base["summary"],
        "source": "estimate",
        "origin": origin,
        "destination": destination,
    }


def _parse_google_leg(mode: TravelMode, payload: dict[str, Any]) -> dict[str, Any] | None:
    routes = payload.get("routes") or []
    if not routes:
        return None
    legs = routes[0].get("legs") or []
    if not legs:
        return None
    leg = legs[0]
    duration_s = int(leg.get("duration", {}).get("value") or 0)
    distance_m = int(leg.get("distance", {}).get("value") or 0)
    steps = leg.get("steps") or []

    transfers = 0
    wait_minutes = 0
    if mode == "transit":
        transit_steps = [s for s in steps if s.get("travel_mode") == "TRANSIT"]
        transfers = max(0, len(transit_steps) - 1)
        for step in transit_steps:
            details = step.get("transit_details") or {}
            departure = details.get("departure_time") or {}
            arrival = details.get("arrival_time") or {}
            # Google does not always expose wait; approximate from headway if present.
            headway = details.get("headway")
            if isinstance(headway, (int, float)):
                wait_minutes += max(0, int(headway) // 60)
            elif departure.get("value") and arrival.get("value"):
                pass
        if wait_minutes == 0 and transit_steps:
            wait_minutes = 3

    cost = {"walking": 0.0, "driving": 8.5, "transit": 2.9}[mode]
    if mode == "driving" and distance_m:
        # Rough NYC ride-hail / fuel+parking proxy based on distance.
        cost = round(5.0 + (distance_m / 1609.34) * 2.5, 2)

    # Ease: higher is easier. Penalize time, transfers, wait, and cost.
    ease = 10
    ease -= min(4, duration_s // 900)
    ease -= min(3, transfers)
    ease -= min(2, wait_minutes // 5)
    if cost >= 5:
        ease -= 1
    ease = max(1, min(10, ease))

    summary_parts = [leg.get("duration", {}).get("text") or f"{duration_s // 60} min"]
    if mode == "transit" and transfers:
        summary_parts.append(f"{transfers} transfer{'s' if transfers != 1 else ''}")
    if mode == "transit" and wait_minutes:
        summary_parts.append(f"~{wait_minutes} min wait")
    if cost:
        summary_parts.append(f"${cost:.2f}")
    else:
        summary_parts.append("free")

    return {
        "mode": mode,
        "duration_minutes": max(1, round(duration_s / 60)),
        "distance_meters": distance_m,
        "cost_usd": cost,
        "transfers": transfers,
        "wait_minutes": wait_minutes,
        "ease_score": ease,
        "summary": f"Google Directions ({mode}): " + ", ".join(summary_parts),
        "source": "google",
        "origin": leg.get("start_address") or "",
        "destination": leg.get("end_address") or "",
    }


def _fetch_google_route(mode: TravelMode, origin: str, destination: str) -> dict[str, Any] | None:
    params = {
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "key": settings.effective_maps_api_key,
        "region": "us",
    }
    try:
        with httpx.Client(timeout=12.0) as client:
            response = client.get(
                "https://maps.googleapis.com/maps/api/directions/json",
                params=params,
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    status = payload.get("status")
    if status != "OK":
        return None
    return _parse_google_leg(mode, payload)


def route_for_mode(mode: TravelMode, origin: str, destination: str) -> dict[str, Any]:
    """Return one travel-mode option (live Google Directions or corridor estimate)."""
    if settings.effective_maps_api_key:
        live = _fetch_google_route(mode, origin, destination)
        if live:
            return live
    return _estimate_route(mode, origin, destination)


def multimodal_routes(origin: str, destination: str) -> list[dict[str, Any]]:
    """Walking, driving, and transit options for the same OD pair."""
    return [route_for_mode(mode, origin, destination) for mode in MODES]


def route_hint(origin: str, destination: str) -> str:
    """Backward-compatible one-line transit hint used by older callers."""
    transit = route_for_mode("transit", origin, destination)
    return str(transit["summary"])
