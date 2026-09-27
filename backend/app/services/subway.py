"""Read-only subway itinerary planning shared by planning and persistence routes."""

import asyncio

from app.config import settings
from app.routing.geocode import TripPlanningError, resolve_place
from app.routing.planner import add_summary
from app.routing.router import ensure_depart_at, plan_trip
from app.schemas import TripCreate


async def plan_subway_trip(body: TripCreate) -> dict:
    origin_label, origin_lat, origin_lon = await resolve_place(body.origin)
    dest_label, dest_lat, dest_lon = await resolve_place(body.destination)
    buffer_minutes = settings.arrive_buffer_minutes if body.buffer_minutes is None else body.buffer_minutes
    buffer_seconds = buffer_minutes * 60 if body.arrive_by is not None else 0
    itinerary = await asyncio.to_thread(
        plan_trip,
        origin_label,
        origin_lat,
        origin_lon,
        dest_label,
        dest_lat,
        dest_lon,
        ensure_depart_at(body.depart_at),
        body.arrive_by,
        buffer_seconds,
    )
    return add_summary(itinerary, body.arrive_by, buffer_seconds)


__all__ = ["TripPlanningError", "plan_subway_trip"]
