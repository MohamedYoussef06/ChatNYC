"""Controlled, data-minimized TigerData context retrieval for Ock."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import TripRecord

logger = logging.getLogger(__name__)

_TRIP_ID = re.compile(r"^[0-9a-fA-F]{32}$")
_ALLOWED_FIELDS = (
    "title",
    "summary",
    "leave_at",
    "arrive_at",
    "duration_seconds",
    "mode",
    "live",
    "source",
)


def _label(value: Any) -> str | None:
    if isinstance(value, str):
        return value[:200]
    if isinstance(value, dict) and isinstance(value.get("label"), str):
        return value["label"][:200]
    return None


def _trip_id(context: dict[str, Any] | None) -> str | None:
    if not isinstance(context, dict):
        return None
    trip = context.get("trip")
    candidates = [context.get("trip_id"), context.get("tripId")]
    if isinstance(trip, dict):
        candidates.extend((trip.get("id"), trip.get("trip_id"), trip.get("tripId")))
    for candidate in candidates:
        if isinstance(candidate, str) and _TRIP_ID.fullmatch(candidate):
            return candidate.lower()
    return None


def _minimal_trip(payload: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for field in _ALLOWED_FIELDS:
        value = payload.get(field)
        if isinstance(value, (str, int, float, bool)) or value is None:
            if value is not None:
                result[field] = value[:500] if isinstance(value, str) else value
    origin = _label(payload.get("origin"))
    destination = _label(payload.get("destination"))
    if origin:
        result["origin"] = origin
    if destination:
        result["destination"] = destination
    return result


def load_tiger_context(db: Session, client_context: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
    """Load only a saved trip explicitly referenced by the current client.

    There is no authenticated user-to-trip relationship in the current schema,
    so listing or guessing other trips would cross guest boundaries.
    """
    trip_id = _trip_id(client_context)
    if not trip_id:
        return {}, True
    try:
        record = db.get(TripRecord, trip_id)
        if record is None:
            return {"saved_trip_status": "not_found"}, True
        payload = json.loads(record.payload)
        if not isinstance(payload, dict):
            return {"saved_trip_status": "invalid"}, True
        return {"saved_trip": _minimal_trip(payload)}, True
    except (SQLAlchemyError, json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning("TigerData Ock context unavailable: %s", type(exc).__name__)
        return {}, False
