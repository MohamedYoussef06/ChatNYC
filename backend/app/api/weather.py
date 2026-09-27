from fastapi import APIRouter

from app.schemas.weather import RouteWeatherRequest
from app.services.weather import route_weather

router = APIRouter()


@router.post("/weather/route")
async def get_route_weather(body: RouteWeatherRequest) -> dict:
    return await route_weather(body)
