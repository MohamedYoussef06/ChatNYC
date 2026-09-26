from fastapi import APIRouter

from app.core.citypilot import plan_trip
from app.schemas.trip import TripRead

router = APIRouter()


@router.get("", response_model=list[TripRead])
def list_trips() -> list[TripRead]:
    return [TripRead.model_validate(plan_trip())]
