from fastapi import APIRouter

from app.core.recommendations import suggest_places
from app.schemas.place import PlaceRead

router = APIRouter()


@router.get("", response_model=list[PlaceRead])
def list_places() -> list[PlaceRead]:
    return [PlaceRead.model_validate(place) for place in suggest_places()]
