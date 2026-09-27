"""Recover a trip from conversation text without a second model."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")
TripMode = Literal["transit", "drive", "walk"]
TimeType = Literal["arrive_by", "depart_at"]

_TIME_EDGE = r"(?=\s+\b(?:tomorrow|today|tonight|at|by|around|before)\b|[?.!]|$)"
_FROM_TO = re.compile(
    rf"\b(?:from|leave from|leaving from)\s+(?P<origin>.+?)\s+\b(?:to|toward|towards)\s+(?P<destination>.+?){_TIME_EDGE}",
    re.IGNORECASE,
)
_BARE_TO = re.compile(
    rf"^(?:help me )?(?P<origin>[A-Za-z0-9][^?.!]{{1,80}}?)\s+\bto\s+(?P<destination>.+?){_TIME_EDGE}",
    re.IGNORECASE,
)
_GET_TO = re.compile(
    rf"\b(?:get me to|get to|go to|going to|way to|be at|need to be at|headed to|heading to)\s+(?P<destination>.+?){_TIME_EDGE}",
    re.IGNORECASE,
)
_LEAVE_FROM = re.compile(r"\bleave from\s+(?P<origin>.+?)(?=[?.!]|$)", re.IGNORECASE)
_TIME = re.compile(
    r"\b(?:(?P<relation>leave at|depart at|at|by|around|before)\s+)?"
    r"(?P<hour>\d{1,2})(?::(?P<minute>\d{2}))?\s*(?P<meridiem>a\.?m\.?|p\.?m\.?)?\b",
    re.IGNORECASE,
)
_DRIVE = re.compile(r"\b(?:driv(?:e|ing)|by car|take (?:a |the )?car)\b", re.IGNORECASE)
_WALK = re.compile(r"\b(?:walk(?:ing)?|on foot)\b", re.IGNORECASE)
_TRANSIT = re.compile(r"\b(?:subway|transit|by train|take the train|the train)\b", re.IGNORECASE)


@dataclass(frozen=True)
class TripIntent:
    origin: str | None = None
    destination: str | None = None
    when: datetime | None = None
    time_type: TimeType = "arrive_by"
    mode: TripMode | None = None

    @property
    def ready(self) -> bool:
        return bool(self.origin and self.destination and self.when)

    @property
    def missing(self) -> list[str]:
        gaps = []
        if not self.origin:
            gaps.append("origin")
        if not self.destination:
            gaps.append("destination")
        if not self.when:
            gaps.append("time")
        return gaps


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .,!?:;")


def _mode(text: str) -> TripMode | None:
    if _DRIVE.search(text):
        return "drive"
    if _WALK.search(text):
        return "walk"
    if _TRANSIT.search(text):
        return "transit"
    return None


def _clock(match: re.Match[str]) -> tuple[int, int, TimeType] | None:
    hour = int(match.group("hour"))
    minute = int(match.group("minute") or 0)
    if hour > 23 or minute > 59 or (hour > 12 and match.group("meridiem")):
        return None
    meridiem = (match.group("meridiem") or "").lower().replace(".", "")
    if meridiem.startswith("p") and hour < 12:
        hour += 12
    elif meridiem.startswith("a") and hour == 12:
        hour = 0
    elif not meridiem and 1 <= hour <= 7:
        hour += 12
    elif not meridiem and hour == 0:
        return None
    relation = (match.group("relation") or "").lower()
    time_type: TimeType = "depart_at" if relation.startswith("leave") or relation.startswith("depart") else "arrive_by"
    return hour, minute, time_type


def _when(text: str, now: datetime) -> tuple[datetime, TimeType] | None:
    local = now.astimezone(NY)
    match = None
    for candidate in _TIME.finditer(text):
        if _clock(candidate):
            match = candidate
    if match is None:
        return None
    parsed = _clock(match)
    if parsed is None:
        return None
    hour, minute, time_type = parsed
    if re.search(r"\btomorrow\b", text, re.IGNORECASE):
        day = local.date() + timedelta(days=1)
    elif re.search(r"\b(today|tonight)\b", text, re.IGNORECASE):
        day = local.date()
    else:
        day = local.date()
        candidate = datetime(day.year, day.month, day.day, hour, minute, tzinfo=NY)
        if candidate <= local:
            day = day + timedelta(days=1)
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=NY), time_type


def _place(value: str | None) -> str | None:
    cleaned = _clean(value or "")
    if not cleaned or re.match(r"^(?:driv(?:e|ing)|walk(?:ing)?|subway|transit|the train|a car)\b", cleaned, re.IGNORECASE):
        return None
    return cleaned


def apply_utterance(intent: TripIntent, text: str, now: datetime) -> TripIntent:
    """Merge only the slots this utterance actually states."""
    origin, destination = intent.origin, intent.destination
    places = _FROM_TO.search(text)
    if places is None and (_TIME.search(text) or re.search(r"\b(?:tomorrow|today|tonight)\b", text, re.IGNORECASE)):
        places = _BARE_TO.search(text.strip())
    if places:
        origin = _place(places.group("origin")) or origin
        destination = _place(places.group("destination")) or destination
    else:
        heading = _GET_TO.search(text)
        if heading:
            destination = _place(heading.group("destination")) or destination
        leaving = _LEAVE_FROM.search(text)
        if leaving:
            origin = _place(leaving.group("origin")) or origin
    when = intent.when
    time_type = intent.time_type
    parsed_when = _when(text, now)
    if parsed_when:
        when, time_type = parsed_when
    mode = _mode(text) or intent.mode
    return replace(intent, origin=origin, destination=destination, when=when, time_type=time_type, mode=mode)


def resolve_trip(user_turns: list[str], now: datetime) -> TripIntent:
    intent = TripIntent()
    for text in user_turns:
        intent = apply_utterance(intent, text, now)
    return intent


def mentions_trip(intent: TripIntent) -> bool:
    return bool(intent.origin or intent.destination or intent.when or intent.mode)
