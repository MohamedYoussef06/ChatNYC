from fastapi import APIRouter, HTTPException, Query

from app.feeds.realtime import live_store, updated_at_iso
from app.feeds.static_gtfs import current_graph
from app.schemas import TripCreate
from app.services.subway import TripPlanningError, plan_subway_trip

router = APIRouter()


@router.post("/transit/plan")
async def plan_transit(body: TripCreate) -> dict:
    """Plan with GTFS without creating a saved-trip database row."""
    try:
        itinerary = await plan_subway_trip(body)
    except TripPlanningError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    snapshot = live_store.snapshot()
    itinerary["mta_enrichment"] = {
        "fresh": snapshot.fresh,
        "updated_at": updated_at_iso(snapshot),
        "live_arrivals_available": bool(snapshot.fresh and snapshot.arrivals),
        "alerts": itinerary.get("alerts", []),
        "transfers": itinerary.get("transfers", 0),
        "subway_segments": [
            {
                "route": leg.get("route"),
                "from": leg.get("from", {}).get("label"),
                "to": leg.get("to", {}).get("label"),
                "departure": leg.get("departure"),
                "arrival": leg.get("arrival"),
                "live": bool(leg.get("live")),
                "headsign": leg.get("headsign"),
            }
            for leg in itinerary.get("legs", [])
            if leg.get("type") == "subway"
        ],
        "transfer_segments": [
            {
                "from": leg.get("from", {}).get("label"),
                "to": leg.get("to", {}).get("label"),
                "departure": leg.get("departure"),
                "arrival": leg.get("arrival"),
            }
            for leg in itinerary.get("legs", [])
            if leg.get("type") == "transfer"
        ],
    }
    return itinerary


@router.get("/transit/alerts")
def transit_alerts(routes: str = Query(default="", max_length=120)) -> dict:
    """Live subway alerts for the requested route labels. Does not plan or save a trip."""
    labels = []
    for part in routes.split(","):
        label = part.strip()
        if label and label not in labels:
            labels.append(label)
        if len(labels) == 12:
            break
    snapshot = live_store.snapshot()
    graph = current_graph()
    updated_at = updated_at_iso(snapshot)
    if graph is None or not snapshot.fresh or not labels:
        return {"fresh": bool(snapshot.fresh and graph is not None), "updated_at": updated_at, "alerts": []}
    route_ids = {
        route_id
        for route_id, name in graph.route_names.items()
        if route_id in labels or name in labels
    }
    alerts = snapshot.alerts_for(route_ids, graph.route_names) if route_ids else []
    return {"fresh": True, "updated_at": updated_at, "alerts": alerts}
