from typing import Literal

from pydantic import BaseModel

TravelMode = Literal["walking", "driving", "transit"]


class TravelOption(BaseModel):
    mode: TravelMode
    duration_minutes: int
    distance_meters: int
    cost_usd: float
    transfers: int
    wait_minutes: int
    ease_score: int
    summary: str
    source: str


class ModeRecommendation(BaseModel):
    recommended_mode: TravelMode
    reason: str
    source: str


class TripRead(BaseModel):
    id: str
    title: str
    origin: str
    destination: str
    summary: str
    options: list[TravelOption]
    recommendation: ModeRecommendation | None = None
