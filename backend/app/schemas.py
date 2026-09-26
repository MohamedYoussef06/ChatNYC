from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class PlaceIn(BaseModel):
    label: str | None = None
    query: str | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def require_location(self) -> "PlaceIn":
        has_coords = self.lat is not None and self.lon is not None
        has_text = bool((self.query or self.label or "").strip())
        if (self.lat is None) ^ (self.lon is None):
            raise ValueError("Provide both lat and lon")
        if not has_coords and not has_text:
            raise ValueError("Each place needs lat/lon or a query")
        return self


class TripCreate(BaseModel):
    origin: PlaceIn
    destination: PlaceIn
    depart_at: datetime | None = None


class MeetingCreate(BaseModel):
    trip_id: str = Field(min_length=1, max_length=32)
    place_name: str = Field(min_length=1, max_length=200)
    arrive_by: datetime | None = None
