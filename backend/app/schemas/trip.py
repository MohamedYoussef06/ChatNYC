from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.place import PlaceIn


class TripCreate(BaseModel):
    origin: PlaceIn
    destination: PlaceIn
    depart_at: datetime | None = None
    # plan backwards from a deadline, depart_at becomes the earliest leave time
    arrive_by: datetime | None = None
    buffer_minutes: int | None = Field(default=None, ge=0, le=60)


class TripPlanStop(BaseModel):
    time: str | None = None
    category: str | None = None
    name: str = Field(min_length=1)
    neighborhood: str | None = None
    note: str | None = None
    price: str | None = None


class TripPlanStep(BaseModel):
    text: str = Field(min_length=1)


class TripPlanCreate(BaseModel):
    """A plan Ock or NextStop already built, stored as-is for later iMessage send."""

    title: str = Field(min_length=1, max_length=200)
    origin: str = Field(min_length=1, max_length=200)
    destination: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    leave_at: str | None = None
    arrive_at: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    source: Literal["ock", "citypilot"] = "ock"
    stops: list[TripPlanStop] | None = None
    steps: list[TripPlanStep] | None = None
    area: str | None = None
    time_label: str | None = None
    total: str | None = None
    budget: str | None = None
    mode: str | None = None


class TripSend(BaseModel):
    phone: str = Field(pattern=r"^\+[1-9]\d{6,14}$", examples=["+14155551234"])
