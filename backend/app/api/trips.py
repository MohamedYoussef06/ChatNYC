import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import TripRecord
from app.routing.geocode import TripPlanningError, resolve_place
from app.routing.planner import add_summary
from app.routing.router import ensure_depart_at, plan_trip
from app.schemas import TripCreate
from app.schemas.route_recommendation import RecommendationRequest, RouteRecommendation
from app.services.grok import recommend_route

router = APIRouter()


@router.post("/trips")
async def create_trip(body: TripCreate, db: Session = Depends(get_db)) -> dict:
    try:
        origin_label, origin_lat, origin_lon = await resolve_place(body.origin)
        dest_label, dest_lat, dest_lon = await resolve_place(body.destination)
        buffer_minutes = settings.arrive_buffer_minutes if body.buffer_minutes is None else body.buffer_minutes
        buffer_seconds = buffer_minutes * 60 if body.arrive_by is not None else 0
        # cpu heavy, don't block the poller
        itinerary = await asyncio.to_thread(
            plan_trip,
            origin_label,
            origin_lat,
            origin_lon,
            dest_label,
            dest_lat,
            dest_lon,
            ensure_depart_at(body.depart_at),
            body.arrive_by,
            buffer_seconds,
        )
        itinerary = add_summary(itinerary, body.arrive_by, buffer_seconds)
    except TripPlanningError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    trip_id = uuid4().hex
    stored = {"id": trip_id, **itinerary}
    record = TripRecord(
        id=trip_id,
        payload=json.dumps(stored),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(record)
    db.commit()
    return stored


@router.get("/trips/{trip_id}")
def get_trip(trip_id: str, db: Session = Depends(get_db)) -> dict:
    record = db.get(TripRecord, trip_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return json.loads(record.payload)


@router.get("/trips")
def list_trips(limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)) -> list[dict]:
    # same shape as the frontend Trip type
    records = db.query(TripRecord).order_by(TripRecord.created_at.desc()).limit(limit).all()
    cards = []
    for record in records:
        plan = add_summary(json.loads(record.payload))
        cards.append(
            {
                "id": plan["id"],
                "title": plan.get("title"),
                "origin": plan["origin"]["label"],
                "destination": plan["destination"]["label"],
                "summary": plan.get("summary"),
                "leave_at": plan.get("leave_at"),
                "arrive_at": plan.get("arrive_at"),
                "duration_seconds": plan.get("duration_seconds"),
                "live": plan.get("live", False),
                "created_at": record.created_at.replace(tzinfo=timezone.utc).isoformat(),
            }
        )
    return cards


@router.post("/trips/recommend", response_model=RouteRecommendation)
async def recommend_trip(request: RecommendationRequest) -> RouteRecommendation:
    if not settings.grok_api_key:
        raise HTTPException(503, "Grok recommendations are not configured. Add GROK_API_KEY to backend/.env and restart the backend.")
    try:
        return await recommend_route(request)
    except httpx.TimeoutException:
        raise HTTPException(504, "Grok took too long. You can still choose a route manually.") from None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, "Grok could not provide a valid recommendation. Check the backend key, model access, and credits, or choose a route manually.") from None
