import json

import httpx

from app.config import settings
from app.schemas import PlaceIn

NYC_BBOX = {
    "boundary.rect.min_lon": -74.3,
    "boundary.rect.min_lat": 40.45,
    "boundary.rect.max_lon": -73.65,
    "boundary.rect.max_lat": 40.95,
    "focus.point.lat": 40.7128,
    "focus.point.lon": -74.006,
}


class TripPlanningError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def resolve_place(place: PlaceIn) -> tuple[str, float, float]:
    if place.lat is not None and place.lon is not None:
        label = (place.label or place.query or f"{place.lat:.5f}, {place.lon:.5f}").strip()
        return label, place.lat, place.lon
    text = (place.query or place.label or "").strip()
    label, lat, lon = await geocode(text)
    if place.label:
        label = place.label.strip()
    return label, lat, lon


async def geocode(text: str) -> tuple[str, float, float]:
    params = {"text": text, "size": 1, **NYC_BBOX}
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(settings.geosearch_url, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, json.JSONDecodeError) as exc:
        raise TripPlanningError("Geocoder unavailable", status_code=502) from exc
    features = payload.get("features") or []
    if not features:
        raise TripPlanningError(f"No NYC match for '{text}'")
    feature = features[0]
    lon, lat = feature["geometry"]["coordinates"]
    label = (feature.get("properties") or {}).get("label") or text
    return str(label), float(lat), float(lon)
