import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.feeds.static_gtfs import RideEdge, Station, TransitGraph
from app.main import app
from app.models import TripMessageRecord
from app.services.photon import MessagingError, send_imessage


def _graph() -> TransitGraph:
    graph = TransitGraph()
    graph.stations = {
        "A": Station("A", "Alpha Sq", 40.75529, -73.987495),
        "B": Station("B", "Beta Sq", 40.735736, -73.990568),
    }
    graph.route_names = {"N": "N"}
    graph.rides = {("A", "N"): [RideEdge("B", 120)]}
    graph.routes_at = {"A": {"N"}}
    return graph


@pytest.fixture
def client(monkeypatch):
    graph = _graph()

    def fake_load() -> None:
        import app.feeds.static_gtfs as static_gtfs

        static_gtfs._graph = graph
        static_gtfs._load_error = None

    async def idle(stop) -> None:
        await stop.wait()

    monkeypatch.setattr("app.main.load", fake_load)
    monkeypatch.setattr("app.main.live_store.poll_loop", idle)
    with TestClient(app) as test_client:
        yield test_client


def test_health_and_station_typeahead(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["gtfs_loaded"] is True
    assert health.json()["stations"] == 2
    rows = client.get("/api/stations", params={"q": "alpha"}).json()
    assert rows[0]["name"] == "Alpha Sq"


def test_plan_persists_and_can_be_shared(client):
    created = client.post(
        "/api/trips",
        json={
            "origin": {"label": "Start", "lat": 40.75529, "lon": -73.987495},
            "destination": {"label": "End", "lat": 40.735736, "lon": -73.990568},
        },
    )
    assert created.status_code == 200, created.text
    trip = created.json()
    assert trip["live"] is False
    assert [leg["type"] for leg in trip["legs"]] == ["walk", "subway", "walk"]
    assert trip["legs"][1]["route"] == "N"
    assert client.get(f"/api/trips/{trip['id']}").json()["id"] == trip["id"]

    meeting = client.post("/api/meetings", json={"trip_id": trip["id"], "place_name": "Beta Sq"})
    assert meeting.status_code == 200, meeting.text
    body = meeting.json()
    assert body["url_path"] == f"/api/meetings/{body['share_code']}"
    shared = client.get(body["url_path"])
    assert shared.status_code == 200
    snapshot = shared.json()
    assert snapshot["place_name"] == "Beta Sq"
    assert snapshot["itinerary"]["id"] == trip["id"]
    assert snapshot["alerts"] == []


def test_share_code_collision_retries(client, monkeypatch):
    created = client.post(
        "/api/trips",
        json={
            "origin": {"label": "Start", "lat": 40.75529, "lon": -73.987495},
            "destination": {"label": "End", "lat": 40.735736, "lon": -73.990568},
        },
    )
    trip_id = created.json()["id"]
    share_codes = iter(["deadbeef", "cafebabe"])
    meeting_ids = iter(["11" * 16, "22" * 16])

    def token_hex(nbytes: int) -> str:
        if nbytes == 4:
            return next(share_codes)
        return next(meeting_ids)

    monkeypatch.setattr("app.api.meetings.secrets.token_hex", token_hex)
    original_commit = Session.commit
    raised = {"done": False}

    def commit(self):
        if not raised["done"]:
            raised["done"] = True
            raise IntegrityError(
                "INSERT INTO meetings",
                {},
                Exception("UNIQUE constraint failed: meetings.share_code"),
            )
        return original_commit(self)

    monkeypatch.setattr(Session, "commit", commit)
    meeting = client.post("/api/meetings", json={"trip_id": trip_id, "place_name": "Beta Sq"})
    assert meeting.status_code == 200, meeting.text
    assert meeting.json()["share_code"] == "cafebabe"
    assert client.get("/api/meetings/cafebabe").status_code == 200


def test_geocoder_invalid_json_is_502(client, monkeypatch):
    class _Response:
        def raise_for_status(self) -> None:
            return None

        def json(self):
            raise json.JSONDecodeError("Expecting value", "<html>not json</html>", 0)

    class _Client:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return _Response()

    monkeypatch.setattr("app.routing.geocode.httpx.AsyncClient", _Client)
    response = client.post(
        "/api/trips",
        json={
            "origin": {"query": "Times Square"},
            "destination": {"label": "End", "lat": 40.735736, "lon": -73.990568},
        },
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Geocoder unavailable"


def test_geocoded_destination(client, monkeypatch):
    async def fake_geocode(text: str) -> tuple[str, float, float]:
        assert text == "Beta Sq"
        return "Beta Sq", 40.735736, -73.990568

    monkeypatch.setattr("app.routing.geocode.geocode", fake_geocode)
    created = client.post(
        "/api/trips",
        json={
            "origin": {"label": "Start", "lat": 40.75529, "lon": -73.987495},
            "destination": {"query": "Beta Sq"},
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["destination"]["label"] == "Beta Sq"


def test_rejects_a_point_outside_nyc_and_unknown_records(client):
    outside = client.post(
        "/api/trips",
        json={
            "origin": {"label": "Boston", "lat": 42.3601, "lon": -71.0589},
            "destination": {"label": "End", "lat": 40.735736, "lon": -73.990568},
        },
    )
    assert outside.status_code == 400
    assert client.get("/api/trips/missing").status_code == 404
    assert client.post("/api/meetings", json={"trip_id": "missing", "place_name": "Here"}).status_code == 404
    assert client.get("/api/meetings/missing").status_code == 404


def _saved_trip(client) -> dict:
    created = client.post(
        "/api/trips",
        json={
            "origin": {"label": "Start", "lat": 40.75529, "lon": -73.987495},
            "destination": {"label": "End", "lat": 40.735736, "lon": -73.990568},
        },
    )
    assert created.status_code == 200, created.text
    return created.json()


def test_saved_trip_is_texted_and_logged(client, monkeypatch):
    trip = _saved_trip(client)
    outbox = []

    async def fake_send(phone: str, text: str) -> dict:
        outbox.append((phone, text))
        return {"status": "sent", "messageId": "msg-1", "fromNumber": "+16282894567"}

    monkeypatch.setattr("app.api.trips.send_imessage", fake_send)
    response = client.post(f"/api/trips/{trip['id']}/send", json={"phone": "+14155551234"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "sent"
    assert body["from_number"] == "+16282894567"

    phone, text = outbox[0]
    assert phone == "+14155551234"
    assert text.startswith("Your trip: Start to End")
    assert "Take the N train from Alpha Sq to Beta Sq" in text
    assert "Walk to End" in text

    with SessionLocal() as db:
        row = db.get(TripMessageRecord, body["id"])
        assert row.trip_id == trip["id"]
        assert row.status == "sent"
        assert row.message_id == "msg-1"
        assert row.body == text


def test_trip_send_failures_are_reported_and_logged(client, monkeypatch):
    trip = _saved_trip(client)

    async def offline(phone: str, text: str) -> dict:
        raise MessagingError("Messaging service is not reachable.", 503)

    monkeypatch.setattr("app.api.trips.send_imessage", offline)
    response = client.post(f"/api/trips/{trip['id']}/send", json={"phone": "+14155551234"})
    assert response.status_code == 503
    with SessionLocal() as db:
        rows = db.query(TripMessageRecord).filter(TripMessageRecord.trip_id == trip["id"]).all()
        assert [(row.status, row.error) for row in rows] == [("failed", "Messaging service is not reachable.")]

    assert client.post(f"/api/trips/{trip['id']}/send", json={"phone": "415-555-1234"}).status_code == 422
    assert client.post("/api/trips/missing/send", json={"phone": "+14155551234"}).status_code == 404


def test_ock_plan_is_saved_and_texted(client, monkeypatch):
    created = client.post(
        "/api/trips/plans",
        json={
            "title": "Your night",
            "origin": "Ivan Ramen",
            "destination": "East River Park",
            "source": "ock",
            "area": "Manhattan",
            "time_label": "Tonight",
            "total": "~$60",
            "budget": "$80",
            "stops": [
                {"time": "7:00 PM", "category": "DINNER", "name": "Ivan Ramen", "neighborhood": "Lower East Side", "price": "~$35", "note": "Start downtown."},
                {"time": "10:30 PM", "category": "WALK", "name": "East River Park", "neighborhood": "Lower East Side", "price": "Free"},
            ],
        },
    )
    assert created.status_code == 200, created.text
    trip = created.json()
    assert trip["source"] == "ock"
    assert trip["origin"]["label"] == "Ivan Ramen"

    outbox = []

    async def fake_send(phone: str, text: str) -> dict:
        outbox.append((phone, text))
        return {"status": "sent", "messageId": "msg-ock", "fromNumber": "+16282894567"}

    monkeypatch.setattr("app.api.trips.send_imessage", fake_send)
    response = client.post(f"/api/trips/{trip['id']}/send", json={"phone": "+14155551234"})
    assert response.status_code == 200, response.text
    text = outbox[0][1]
    assert "Your trip: Your night" in text
    assert "7:00 PM — DINNER: Ivan Ramen" in text
    assert "Estimated total: ~$60 / $80" in text


def test_citypilot_plan_is_saved_and_texted(client, monkeypatch):
    created = client.post(
        "/api/trips/plans",
        json={
            "title": "Times Square to Union Square",
            "origin": "Times Square",
            "destination": "Union Square",
            "source": "citypilot",
            "mode": "Transit",
            "leave_at": "3:00 PM",
            "arrive_at": "3:22 PM",
            "steps": [{"text": "Take the N train from Times Sq-42 St to 14 St-Union Sq"}],
        },
    )
    assert created.status_code == 200, created.text
    trip = created.json()
    outbox = []

    async def fake_send(phone: str, text: str) -> dict:
        outbox.append((phone, text))
        return {"status": "sent", "fromNumber": "+16282894567"}

    monkeypatch.setattr("app.api.trips.send_imessage", fake_send)
    response = client.post(f"/api/trips/{trip['id']}/send", json={"phone": "+14155551234"})
    assert response.status_code == 200, response.text
    text = outbox[0][1]
    assert "Transit" in text
    assert "Leave 3:00 PM, arrive 3:22 PM" in text
    assert "Take the N train from Times Sq-42 St to 14 St-Union Sq" in text


def test_messaging_client_sends_bearer_key_and_surfaces_errors(monkeypatch):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        return httpx.Response(502, json={"detail": "Shared user limit reached"})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        "app.services.photon.httpx.AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    monkeypatch.setattr("app.services.photon.settings.messaging_url", "http://messaging.test/")
    monkeypatch.setattr("app.services.photon.settings.messaging_api_key", "local-key")
    with pytest.raises(MessagingError) as raised:
        asyncio.run(send_imessage("+14155551234", "hello"))
    assert raised.value.status_code == 502
    assert raised.value.message == "Shared user limit reached"
    assert seen == {
        "url": "http://messaging.test/messages",
        "auth": "Bearer local-key",
        "body": {"phone": "+14155551234", "text": "hello"},
    }
