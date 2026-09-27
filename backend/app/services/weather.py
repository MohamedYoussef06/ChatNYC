"""Server-side Google Weather forecast lookup and normalized route response."""

import asyncio
from datetime import datetime, timezone

import httpx

from app.config import settings

WEATHER_URL = "https://weather.googleapis.com/v1/forecast/hours:lookup"


def _stamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _normalize(hour: dict, point, target: datetime) -> dict | None:
    forecast_time = hour.get("interval", {}).get("startTime") or hour.get("forecastTime")
    parsed_time = _stamp(forecast_time)
    condition = hour.get("weatherCondition") or {}
    description = condition.get("description", {}).get("text") if isinstance(condition.get("description"), dict) else condition.get("description")
    if parsed_time is None or not isinstance(description, str) or not description.strip():
        return None

    def measure(key: str) -> dict | None:
        item = hour.get(key)
        if not isinstance(item, dict) or not isinstance(item.get("degrees"), (int, float)):
            return None
        return {"value": item["degrees"], "unit": "C"}

    precipitation = hour.get("precipitation")
    probability = precipitation.get("probability") if isinstance(precipitation, dict) else None
    wind = hour.get("wind") if isinstance(hour.get("wind"), dict) else None
    visibility = hour.get("visibility") if isinstance(hour.get("visibility"), dict) else None
    speed = wind.get("speed") if wind else None
    distance = visibility.get("distance") if visibility else None
    condition_type = condition.get("type")
    context = {
        "location": {"latitude": point.latitude, "longitude": point.longitude, **({"label": point.label} if point.label else {})},
        "forecastTime": parsed_time.astimezone(timezone.utc).isoformat(),
        "condition": {"description": description.strip(), **({"type": condition_type} if isinstance(condition_type, str) else {})},
        "sourceUpdatedAt": datetime.now(timezone.utc).isoformat(),
    }
    temperature = measure("temperature")
    feels_like = measure("feelsLikeTemperature")
    if temperature:
        context["temperature"] = temperature
    if feels_like:
        context["feelsLike"] = feels_like
    if isinstance(probability, dict):
        percent = probability.get("percent")
        kind = probability.get("type")
        if isinstance(percent, (int, float)) or isinstance(kind, str):
            context["precipitation"] = {**({"probability": percent} if isinstance(percent, (int, float)) else {}), **({"type": kind} if isinstance(kind, str) and kind != "PRECIPITATION_TYPE_UNSPECIFIED" else {})}
    if isinstance(speed, dict) and isinstance(speed.get("value"), (int, float)):
        unit = speed.get("unit")
        context["wind"] = {"speed": speed["value"], **({"unit": unit} if isinstance(unit, str) else {})}
    if isinstance(distance, dict) and isinstance(distance.get("value"), (int, float)):
        unit = distance.get("unit")
        context["visibility"] = {"value": distance["value"], **({"unit": unit} if isinstance(unit, str) else {})}
    storm = hour.get("thunderstormProbability")
    if isinstance(storm, (int, float)):
        context["thunderstormProbability"] = storm
    return context


async def _at_time(client: httpx.AsyncClient, point, target: datetime) -> dict | None:
    target = target if target.tzinfo else target.replace(tzinfo=timezone.utc)
    page_token: str | None = None
    for _ in range(10):
        params = {"location.latitude": point.latitude, "location.longitude": point.longitude, "unitsSystem": "METRIC", "pageSize": 24, "hours": 240}
        if page_token:
            params["pageToken"] = page_token
        response = await client.get(WEATHER_URL, params=params, headers={"X-Goog-Api-Key": settings.google_maps_api_key})
        response.raise_for_status()
        payload = response.json()
        hours = payload.get("forecastHours", [])
        parsed = [(_stamp(row.get("interval", {}).get("startTime")), row) for row in hours if isinstance(row, dict)]
        candidate = min((item for item in parsed if item[0] is not None), key=lambda item: abs((item[0] - target).total_seconds()), default=None)
        next_page = payload.get("nextPageToken")
        if candidate and (abs((candidate[0] - target).total_seconds()) <= 3600 or not next_page):
            return _normalize(candidate[1], point, target)
        if not next_page:
            return _normalize(candidate[1], point, target) if candidate else None
        page_token = next_page
    return None


async def route_weather(body) -> dict:
    result = {"departure": None, "arrival": None, "midpoint": None}
    if not settings.google_maps_api_key.strip():
        return result
    async with httpx.AsyncClient(timeout=8) as client:
        async def safe_lookup(point, when):
            try:
                return await _at_time(client, point, when)
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                # Each route point is independent; one provider error does not discard the other.
                return None

        result["departure"], result["arrival"] = await asyncio.gather(
            safe_lookup(body.origin, body.departure_time),
            safe_lookup(body.destination, body.arrival_time),
        )
    return result
