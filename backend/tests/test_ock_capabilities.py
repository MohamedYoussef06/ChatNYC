import asyncio
import json
from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.api import assistant
from app.feeds.realtime import live_store
from app.routing.geocode import TripPlanningError
from app.schemas.assistant import ChatRequest, ChatResponse, ChatTurn
from app.services import backboard
from app.services import ock_capabilities
from app.services.ock import run_chat
from app.services.trip_intent import resolve_trip

from test_ock import FakeDb

NY = ZoneInfo("America/New_York")
FIRST = "Columbia to Grand Central tomorrow 5pm"
FOLLOW = "Actually I want to drive instead"


def _complete(captured):
    async def complete(messages, **kwargs):
        captured["messages"] = messages
        captured["kwargs"] = kwargs
        return "Prepared in NextStop."
    return complete


def _capability(messages):
    block = next(message["content"] for message in messages if message["content"].startswith("<CHATNYC_CAPABILITY_RESULTS>"))
    return json.loads(block.split("\n", 1)[1].rsplit("\n", 1)[0])


def test_trip_intent_uses_transit_routing_and_returns_nextstop_action(monkeypatch):
    called = {}

    async def plan(_body):
        called["mode"] = "transit"
        return {"duration_seconds": 1500, "leave_at": "2026-09-28T16:35:00-04:00", "arrive_at": "2026-09-28T17:00:00-04:00", "summary": "1 train", "routes": ["1"], "alerts": [{"header": "1 train delays", "routes": ["1"]}], "live": True}

    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    monkeypatch.setattr(live_store, "snapshot", lambda: SimpleNamespace(fresh=True))
    captured = {}
    result = asyncio.run(run_chat(ChatRequest(message=FIRST), FakeDb(), _complete(captured)))
    route = _capability(captured["messages"])["route"]
    assert called["mode"] == "transit"
    assert route["status"] == "available"
    assert route["mta"]["status"] == "available"
    assert route["mta"]["alerts"][0]["header"] == "1 train delays"
    assert result.actions[0].type == "open_nextstop"
    assert result.actions[0].trip.origin == "Columbia"
    assert result.actions[0].trip.destination == "Grand Central"
    assert result.actions[0].trip.mode == "transit"
    assert result.actions[0].trip.date_time.endswith("T17:00:00-04:00")


def test_drive_follow_up_preserves_trip_and_uses_driving_capability(monkeypatch):
    called = {}

    async def road(mode, origin, destination, _depart_at):
        called["road"] = (mode, origin, destination)
        return {"status": "available", "mode": mode, "duration_seconds": 1800, "distance_meters": 9000}

    async def transit(_body):
        raise AssertionError("A drive follow-up must not call the subway planner")

    monkeypatch.setattr(ock_capabilities, "compute_road_route", road)
    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", transit)
    captured = {}
    result = asyncio.run(run_chat(ChatRequest(
        message=FOLLOW,
        history=[ChatTurn(role="user", content=FIRST), ChatTurn(role="assistant", content="Prepared.")],
    ), FakeDb(), _complete(captured)))
    assert called["road"] == ("drive", "Columbia", "Grand Central")
    assert _capability(captured["messages"])["route"]["duration_seconds"] == 1800
    assert result.actions[0].trip.mode == "drive"
    assert result.actions[0].trip.origin == "Columbia"
    assert result.actions[0].trip.destination == "Grand Central"
    assert result.actions[0].trip.date_time.endswith("T17:00:00-04:00")


def test_live_mta_context_is_given_to_grok_when_the_feed_is_fresh(monkeypatch):
    async def plan(_body):
        return {"duration_seconds": 900, "alerts": [{"header": "Uptown 1 delays", "routes": ["1"]}], "live": True}

    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    monkeypatch.setattr(live_store, "snapshot", lambda: SimpleNamespace(fresh=True))
    captured = {}
    asyncio.run(run_chat(ChatRequest(message=FIRST), FakeDb(), _complete(captured)))
    encoded = json.dumps(_capability(captured["messages"]))
    assert "Uptown 1 delays" in encoded
    assert '"status": "available"' in encoded


def test_mta_failure_keeps_the_route_and_omits_fabricated_alerts(monkeypatch):
    async def plan(_body):
        return {"duration_seconds": 900, "summary": "Schedule only", "alerts": [{"header": "should not be forwarded"}]}

    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    monkeypatch.setattr(live_store, "snapshot", lambda: SimpleNamespace(fresh=False))
    captured = {}
    result = asyncio.run(run_chat(ChatRequest(message=FIRST), FakeDb(), _complete(captured)))
    route = _capability(captured["messages"])["route"]
    assert route["status"] == "available"
    assert route["duration_seconds"] == 900
    assert route["mta"] == {"status": "unavailable"}
    assert "should not be forwarded" not in json.dumps(route)
    assert result.actions is not None


def test_routing_failure_returns_no_fabricated_eta(monkeypatch):
    async def plan(_body):
        raise TripPlanningError("no path")

    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    captured = {}
    result = asyncio.run(run_chat(ChatRequest(message=FIRST), FakeDb(), _complete(captured)))
    route = _capability(captured["messages"])["route"]
    assert route == {"status": "unavailable", "mode": "transit"}
    assert "duration" not in json.dumps(route)
    assert "eta" not in json.dumps(route)
    assert result.actions[0].trip.destination == "Grand Central"


def test_backboard_failure_still_plans_the_trip(monkeypatch):
    monkeypatch.setattr(backboard, "is_configured", lambda: True)

    async def unavailable(*_args, **_kwargs):
        raise backboard.BackboardUnavailable()

    async def plan(_body):
        return {"duration_seconds": 800, "summary": "Still planned", "alerts": []}

    monkeypatch.setattr(backboard, "relevant_memories", unavailable)
    monkeypatch.setattr(backboard, "persist_exchange", unavailable)
    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    monkeypatch.setattr(live_store, "snapshot", lambda: SimpleNamespace(fresh=False))
    result = asyncio.run(run_chat(ChatRequest(message=FIRST, session_id="guest-session-plan"), FakeDb(), _complete({})),)
    assert result.persistence == "stateless"
    assert result.actions[0].trip.origin == "Columbia"
    assert result.reply == "Prepared in NextStop."


def test_tigerdata_failure_still_plans_a_new_trip(monkeypatch):
    async def plan(_body):
        return {"duration_seconds": 700, "summary": "Independent of saved trips", "alerts": []}

    monkeypatch.setattr(ock_capabilities, "plan_subway_trip", plan)
    monkeypatch.setattr(live_store, "snapshot", lambda: SimpleNamespace(fresh=False))
    from sqlalchemy.exc import OperationalError
    result = asyncio.run(run_chat(
        ChatRequest(message=FIRST, context={"trip_id": "c" * 32}),
        FakeDb(error=OperationalError("select", {}, Exception("offline"))),
        _complete({}),
    ))
    assert result.actions[0].trip.destination == "Grand Central"


def test_chat_response_without_actions_stays_compatible(monkeypatch):
    monkeypatch.setattr(assistant, "is_configured", lambda: True)

    async def complete(_messages, **_kwargs):
        return "Hello."

    monkeypatch.setattr(assistant, "complete", complete)
    response = asyncio.run(assistant.chat(ChatRequest(message="What now?"), FakeDb()))
    assert isinstance(response, ChatResponse)
    assert response.model_dump(exclude_none=True) == {"reply": "Hello."}


def test_follow_up_slots_do_not_depend_on_exact_drive_phrasing():
    now = datetime(2026, 9, 27, 9, 0, tzinfo=NY)
    intent = resolve_trip([
        "Help me get from Columbia University to Grand Central tomorrow at 5.",
        "Take the car instead.",
    ], now)
    assert intent.origin == "Columbia University"
    assert intent.destination == "Grand Central"
    assert intent.when == datetime(2026, 9, 28, 17, 0, tzinfo=NY)
    assert intent.mode == "drive"
    assert intent.time_type == "arrive_by"
