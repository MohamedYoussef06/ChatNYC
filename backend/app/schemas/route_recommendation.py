from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TravelMode = Literal["Walk", "Drive", "Transit"]


class RouteMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    mode: TravelMode
    durationMinutes: float = Field(gt=0, le=10080)
    distanceMeters: float = Field(ge=0, le=1000000)
    cost: float | None = Field(ge=0, le=100000)
    currency: str | None = Field(max_length=3)
    costNote: str = Field(max_length=240)
    walkingMinutes: float | None = Field(ge=0, le=10080)
    transfers: int = Field(ge=0, le=100)
    transferWaitMinutes: float | None = Field(ge=0, le=10080)
    serviceHeadwayMinutes: float | None = Field(ge=0, le=1440)
    canArriveOnTime: bool


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    options: list[RouteMetrics] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def unique_modes(self):
        if len({option.mode for option in self.options}) != len(self.options):
            raise ValueError("Each travel mode must appear once.")
        return self


class RouteRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: TravelMode
    reason: str = Field(min_length=1, max_length=600)
    tradeoffs: list[str] = Field(min_length=1, max_length=3)
