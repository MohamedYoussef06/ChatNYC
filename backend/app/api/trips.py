from fastapi import APIRouter, HTTPException
import httpx

from app.core.citypilot import plan_trip
from app.schemas.trip import TripRead
from app.schemas.route_recommendation import RecommendationRequest, RouteRecommendation
from app.services.grok import recommend_route
from app.config import settings

router = APIRouter()


@router.get("", response_model=list[TripRead])
def list_trips() -> list[TripRead]:
    return [TripRead.model_validate(plan_trip())]


@router.post("/recommend", response_model=RouteRecommendation)
async def recommend_trip(request: RecommendationRequest) -> RouteRecommendation:
    if not settings.grok_api_key:
        raise HTTPException(503, "Grok recommendations are not configured. Add GROK_API_KEY to backend/.env and restart the backend.")
    try:
        return await recommend_route(request)
    except httpx.TimeoutException:
        raise HTTPException(504, "Grok took too long. You can still choose a route manually.") from None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, "Grok could not provide a valid recommendation. Check the backend key, model access, and credits, or choose a route manually.") from None
