import json
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import TripRecord
from app.routing.geocode import TripPlanningError, resolve_place
from app.routing.router import ensure_depart_at, plan_trip
from app.schemas import TripCreate

router = APIRouter()


@router.post("/trips")
async def create_trip(body: TripCreate, db: Session = Depends(get_db)) -> dict:
    try:
        origin_label, origin_lat, origin_lon = await resolve_place(body.origin)
        dest_label, dest_lat, dest_lon = await resolve_place(body.destination)
        itinerary = plan_trip(
            origin_label,
            origin_lat,
            origin_lon,
            dest_label,
            dest_lat,
            dest_lon,
            ensure_depart_at(body.depart_at),
        )
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
