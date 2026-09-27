import json

import httpx

from app.config import settings
from app.feeds.static_gtfs import current_graph
from app.routing.places import clustered, distance_m, match_stations, tokens
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
    label, lat, lon = await find(text)
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


USER_AGENT = "divhacks-nyc-trip-planner/0.1 (github.com/MohamedYoussef06/DivHacks---Unnamed-Project-MTA-THINGY-)"
NOMINATIM_VIEWBOX = "-74.3,40.95,-73.65,40.45"
_cache: dict[str, tuple[str, float, float]] = {}


async def find(text: str) -> tuple[str, float, float]:
    graph = current_graph()
    stations = match_stations(graph, text) if graph is not None else []
    if stations and clustered(stations):
        return stations[0].name, stations[0].lat, stations[0].lon
    try:
        label, lat, lon = await lookup(text)
    except TripPlanningError:
        if not stations:
            raise
        names = ", ".join(sorted({s.name for s in stations})[:4])
        raise TripPlanningError(f"'{text}' matches more than one station ({names}). Add a cross street or borough.")
    if stations:
        # several 86 St stations, keep the one closest to the geocoder hit
        best = min(stations, key=lambda s: distance_m(lat, lon, s.lat, s.lon))
        return best.name, best.lat, best.lon
    return label, lat, lon


async def lookup(text: str) -> tuple[str, float, float]:
    key = " ".join(text.lower().split())
    if key in _cache:
        return _cache[key]
    errors = 0
    hit = None
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        try:
            hit = await _geosearch(client, text)
        except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError):
            errors += 1
        if (hit is None or not hit[3]) and settings.nominatim_url:
            try:
                osm = await _nominatim(client, text)
            except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError):
                osm = None
                errors += 1
            if osm is not None:
                hit = (*osm, True)
    if hit is None:
        if errors:
            raise TripPlanningError("Geocoder unavailable", status_code=502)
        raise TripPlanningError(f"No NYC match for '{text}'")
    if len(_cache) > 500:
        _cache.clear()
    _cache[key] = hit[:3]
    return hit[:3]


async def _geosearch(client: httpx.AsyncClient, text: str) -> tuple[str, float, float, bool] | None:
    response = await client.get(settings.geosearch_url, params={"text": text, "size": 5, **NYC_BBOX})
    response.raise_for_status()
    features = response.json().get("features") or []
    wanted = set(tokens(text))
    best = None
    best_overlap = 0.0
    for feature in features:
        props = feature.get("properties") or {}
        label = props.get("label") or text
        overlap = len(wanted & set(tokens(label))) / len(wanted) if wanted else 0.0
        if overlap > best_overlap:
            best, best_overlap = feature, overlap
    if best is None:
        # no word overlap at all, like grand central giving ESPLANADE GD PLAZA
        return None
    lon, lat = best["geometry"]["coordinates"]
    label = (best.get("properties") or {}).get("label") or text
    return str(label), float(lat), float(lon), best_overlap >= 1.0


async def _nominatim(client: httpx.AsyncClient, text: str) -> tuple[str, float, float] | None:
    params = {
        "q": text,
        "format": "jsonv2",
        "limit": 1,
        "countrycodes": "us",
        "viewbox": NOMINATIM_VIEWBOX,
        "bounded": 1,
    }
    response = await client.get(settings.nominatim_url, params=params)
    response.raise_for_status()
    rows = response.json()
    if not rows:
        return None
    row = rows[0]
    label = row.get("name") or str(row.get("display_name", text)).split(",")[0]
    return str(label), float(row["lat"]), float(row["lon"])


async def autocomplete(text: str, limit: int = 5) -> list[dict]:
    url = settings.geosearch_url.replace("/search", "/autocomplete")
    try:
        async with httpx.AsyncClient(timeout=5, headers={"User-Agent": USER_AGENT}) as client:
            response = await client.get(url, params={"text": text, **NYC_BBOX})
            response.raise_for_status()
            features = response.json().get("features") or []
    except (httpx.HTTPError, json.JSONDecodeError):
        return []
    out = []
    for feature in features[:limit]:
        lon, lat = feature["geometry"]["coordinates"]
        out.append({"type": "address", "name": (feature.get("properties") or {}).get("label"), "lat": lat, "lon": lon})
    return out
