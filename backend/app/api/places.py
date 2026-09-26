from fastapi import APIRouter, Query

from app.api.stations import station_routes
from app.feeds.static_gtfs import current_graph
from app.routing.geocode import autocomplete
from app.routing.places import match_stations

router = APIRouter()


@router.get("/places")
async def search_places(q: str = Query(min_length=2, max_length=80), limit: int = Query(default=8, ge=1, le=20)) -> list[dict]:
    results: list[dict] = []
    graph = current_graph()
    if graph is not None:
        stations = match_stations(graph, q) or graph.search(q, limit=limit)
        for station in stations[: limit // 2 or 1]:
            results.append(
                {
                    "type": "station",
                    "id": station.id,
                    "name": station.name,
                    "lat": station.lat,
                    "lon": station.lon,
                    "routes": station_routes(graph, station.id),
                }
            )
    results.extend(await autocomplete(q, limit - len(results)))
    return results[:limit]
