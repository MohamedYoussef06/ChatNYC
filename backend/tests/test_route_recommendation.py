import json

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services import grok

client = TestClient(app)


def option(mode="Walk", on_time=True):
    return dict(mode=mode, durationMinutes=20, distanceMeters=1500, cost=0 if mode == "Walk" else None,
                currency="USD" if mode == "Walk" else None, costNote="No fare" if mode == "Walk" else "Unknown",
                walkingMinutes=20 if mode == "Walk" else None, transfers=0, transferWaitMinutes=0,
                serviceHeadwayMinutes=None, canArriveOnTime=on_time)


def mock_grok(monkeypatch, payload, status=200):
    monkeypatch.setattr(settings, "grok_api_key", "test-key")
    original_client = httpx.AsyncClient
    requests = []

    def respond(request):
        requests.append(json.loads(request.content))
        return httpx.Response(status, json=payload)

    monkeypatch.setattr(grok.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    return requests


def completion(mode="Walk"):
    return {"choices": [{"message": {"content": json.dumps(dict(mode=mode, reason="Walking is free and meets the deadline.", tradeoffs=["Requires walking effort."]))}}]}


def test_missing_key_is_explicit(monkeypatch):
    monkeypatch.setattr(settings, "grok_api_key", None)
    response = client.post("/api/trips/recommend", json={"options": [option(), option("Drive")]})
    assert response.status_code == 503
    assert "GROK_API_KEY" in response.json()["detail"]


def test_valid_grok_recommendation_preserves_unknown_cost(monkeypatch):
    requests = mock_grok(monkeypatch, completion())
    response = client.post("/api/trips/recommend", json={"options": [option(), option("Drive")]})
    assert response.status_code == 200
    assert response.json()["mode"] == "Walk"
    metrics = json.loads(requests[0]["messages"][1]["content"])
    assert metrics["options"][1]["cost"] is None
    assert requests[0]["response_format"]["json_schema"]["strict"] is True
    assert "test-key" not in response.text


def test_rejects_unavailable_recommendation(monkeypatch):
    mock_grok(monkeypatch, completion("Transit"))
    assert client.post("/api/trips/recommend", json={"options": [option(), option("Drive")]}).status_code == 502


def test_rejects_late_route_when_on_time_option_exists(monkeypatch):
    mock_grok(monkeypatch, completion("Drive"))
    assert client.post("/api/trips/recommend", json={"options": [option(), option("Drive", False)]}).status_code == 502


def test_bad_provider_json_and_auth_failure_are_safe(monkeypatch):
    mock_grok(monkeypatch, {"error": "private provider details"}, status=401)
    response = client.post("/api/trips/recommend", json={"options": [option(), option("Drive")]})
    assert response.status_code == 502
    assert "private provider details" not in response.text


def test_rejects_duplicate_modes_and_negative_duration():
    assert client.post("/api/trips/recommend", json={"options": [option(), option()]}).status_code == 422
    invalid = option()
    invalid["durationMinutes"] = -1
    assert client.post("/api/trips/recommend", json={"options": [invalid, option("Drive")]}).status_code == 422


def test_requires_two_options_without_calling_grok(monkeypatch):
    requests = mock_grok(monkeypatch, completion())
    for options in ([], [option()]):
        assert client.post("/api/trips/recommend", json={"options": options}).status_code == 422
    assert requests == []


def test_compares_all_three_options(monkeypatch):
    requests = mock_grok(monkeypatch, completion("Transit"))
    response = client.post("/api/trips/recommend", json={"options": [option(), option("Drive"), option("Transit")]})
    assert response.status_code == 200
    assert response.json()["mode"] == "Transit"
    assert len(json.loads(requests[0]["messages"][1]["content"])["options"]) == 3
