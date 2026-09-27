from datetime import datetime

from pydantic import BaseModel, Field


class MeetingCreate(BaseModel):
    trip_id: str = Field(min_length=1, max_length=32)
    place_name: str = Field(min_length=1, max_length=200)
    arrive_by: datetime | None = None
