from fastapi import APIRouter, HTTPException, Query

from app.feeds.static_gtfs import current_graph, load_error

router = APIRouter()


@router.get("/stations")
def search_stations(q: str = Query(default="", max_length=80)) -> list[dict[str, object]]:
    graph = current_graph()
    if graph is None:
        raise HTTPException(status_code=503, detail=load_error() or "Subway data is not loaded")
    return [
        {"id": station.id, "name": station.name, "lat": station.lat, "lon": station.lon}
        for station in graph.search(q)
    ]
