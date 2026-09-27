from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.place import PlaceIn


class TripCreate(BaseModel):
    origin: PlaceIn
    destination: PlaceIn
    depart_at: datetime | None = None
    # plan backwards from a deadline, depart_at becomes the earliest leave time
    arrive_by: datetime | None = None
    buffer_minutes: int | None = Field(default=None, ge=0, le=60)
