import json
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.feeds.realtime import live_store
from app.feeds.static_gtfs import current_graph
from app.models import MeetingRecord, TripRecord
from app.schemas import MeetingCreate

router = APIRouter()


@router.post("/meetings")
def create_meeting(body: MeetingCreate, db: Session = Depends(get_db)) -> dict:
    trip = db.get(TripRecord, body.trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    arrive_by = body.arrive_by.isoformat() if body.arrive_by is not None else None
    itinerary = json.loads(trip.payload)
    trip_id = trip.id
    for _ in range(5):
        share_code = secrets.token_hex(4)
        taken = db.query(MeetingRecord.id).filter(MeetingRecord.share_code == share_code).first()
        if taken is not None:
            continue
        snapshot = {
            "share_code": share_code,
            "place_name": body.place_name,
            "arrive_by": arrive_by,
            "itinerary": itinerary,
            "alerts": _alerts_now(itinerary),
        }
        record = MeetingRecord(
            id=secrets.token_hex(16),
            trip_id=trip_id,
            place_name=body.place_name,
            arrive_by=arrive_by,
            share_code=share_code,
            snapshot=json.dumps(snapshot),
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(record)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            if "share_code" not in str(exc.orig):
                raise
            continue
        return {
            "share_code": share_code,
            "url_path": f"/api/meetings/{share_code}",
            "share_url": f"{settings.share_url_base.rstrip('/')}/{share_code}",
        }
    raise HTTPException(status_code=500, detail="Could not allocate a share code")


@router.get("/meetings/{share_code}")
def get_meeting(share_code: str, db: Session = Depends(get_db)) -> dict:
    record = db.query(MeetingRecord).filter(MeetingRecord.share_code == share_code).one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return json.loads(record.snapshot)


def _alerts_now(itinerary: dict) -> list:
    snapshot = live_store.snapshot()
    graph = current_graph()
    if not snapshot.fresh or graph is None:
        return itinerary.get("alerts") or []
    labels = {leg["route"] for leg in itinerary.get("legs", []) if leg.get("type") == "subway"}
    route_ids = {route_id for route_id, label in graph.route_names.items() if label in labels} or labels
    return snapshot.alerts_for(route_ids, graph.route_names)
