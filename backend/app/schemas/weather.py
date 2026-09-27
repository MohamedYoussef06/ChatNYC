from datetime import datetime

from pydantic import BaseModel, Field


class WeatherPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    label: str | None = Field(default=None, max_length=160)


class RouteWeatherRequest(BaseModel):
    origin: WeatherPoint
    destination: WeatherPoint
    departure_time: datetime
    arrival_time: datetime
