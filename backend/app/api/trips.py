import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import TripRecord
from app.routing.planner import add_summary
from app.schemas import TripCreate
from app.schemas.route_recommendation import RecommendationRequest, RouteRecommendation
from app.services.grok import GrokUnavailable, is_configured, recommend_route
from app.services.subway import TripPlanningError, plan_subway_trip

router = APIRouter()


@router.post("/trips")
async def create_trip(body: TripCreate, db: Session = Depends(get_db)) -> dict:
    try:
        itinerary = await plan_subway_trip(body)
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
    if not is_configured():
        raise HTTPException(503, "Grok recommendations are not configured. Add GROK_API_KEY to backend/.env and restart the backend.")
    try:
        return await recommend_route(request)
    except GrokUnavailable as exc:
        status_code = 504 if "too long" in str(exc).lower() else 502
        raise HTTPException(status_code, f"{exc} You can still choose a route manually.") from None
