import json

import httpx
import pytest
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
        requests.append({
            "body": json.loads(request.content),
            "path": request.url.path,
            "authorization": request.headers.get("authorization"),
            "content_type": request.headers.get("content-type"),
        })
        return httpx.Response(status, json=payload)

    monkeypatch.setattr(grok.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(respond), **kwargs))
    return requests


def completion(mode="Walk"):
    return {
        "object": "response",
        "status": "completed",
        "output": [
            {"type": "reasoning", "summary": [{"text": "private reasoning must not be returned"}], "encrypted_content": "opaque"},
            {"type": "message", "role": "assistant", "content": [{
                "type": "output_text",
                "text": json.dumps(dict(mode=mode, reason="Walking is free and meets the deadline.", tradeoffs=["Requires walking effort."])),
            }]},
        ],
    }


def test_missing_key_is_explicit(monkeypatch):
    monkeypatch.setattr(settings, "grok_api_key", None)
    response = client.post("/api/trips/recommend", json={"options": [option()]})
    assert response.status_code == 503
    assert "GROK_API_KEY" in response.json()["detail"]


def test_valid_grok_recommendation_preserves_unknown_cost(monkeypatch):
    requests = mock_grok(monkeypatch, completion())
    response = client.post("/api/trips/recommend", json={"options": [option(), option("Drive")]})
    assert response.status_code == 200
    assert response.json()["mode"] == "Walk"
    body = requests[0]["body"]
    metrics = json.loads(body["input"][1]["content"])
    assert metrics["options"][1]["cost"] is None
    assert requests[0]["path"] == "/v1/responses"
    assert requests[0]["authorization"] == "Bearer test-key"
    assert requests[0]["content_type"] == "application/json"
    assert body["model"] == settings.grok_model
    assert body["max_output_tokens"] == 700
    assert body["text"]["format"]["type"] == "json_schema"
    assert body["text"]["format"]["name"] == "route_recommendation"
    assert body["text"]["format"]["strict"] is True
    assert body["text"]["format"]["schema"]["additionalProperties"] is False
    assert "test-key" not in response.text


def test_rejects_unavailable_recommendation(monkeypatch):
    mock_grok(monkeypatch, completion("Transit"))
    assert client.post("/api/trips/recommend", json={"options": [option()]}).status_code == 502


def test_rejects_late_route_when_on_time_option_exists(monkeypatch):
    mock_grok(monkeypatch, completion("Drive"))
    assert client.post("/api/trips/recommend", json={"options": [option(), option("Drive", False)]}).status_code == 502


def test_bad_provider_json_and_auth_failure_are_safe(monkeypatch):
    mock_grok(monkeypatch, {"error": "private provider details"}, status=401)
    response = client.post("/api/trips/recommend", json={"options": [option()]})
    assert response.status_code == 502
    assert "private provider details" not in response.text


def test_completion_extracts_assistant_output_text_not_reasoning(monkeypatch):
    payload = {
        "status": "completed",
        "output": [
            {"type": "reasoning", "summary": [{"text": "not user-facing"}], "encrypted_content": "opaque"},
            {"type": "message", "role": "assistant", "content": [
                {"type": "output_text", "text": "Ock response."},
            ]},
        ],
    }
    requests = mock_grok(monkeypatch, payload)
    import asyncio

    result = asyncio.run(grok.complete([
        {"role": "system", "content": "System instruction."},
        {"role": "user", "content": "Hello."},
    ], max_tokens=321))
    assert result == "Ock response."
    body = requests[0]["body"]
    assert body["input"] == [
        {"role": "system", "content": "System instruction."},
        {"role": "user", "content": "Hello."},
    ]
    assert body["max_output_tokens"] == 321
    assert "messages" not in body
    assert "max_tokens" not in body


def test_incomplete_responses_api_result_is_not_returned(monkeypatch):
    mock_grok(monkeypatch, {
        "status": "incomplete",
        "output": [{"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "partial"}]}],
    })
    import asyncio

    with pytest.raises(grok.GrokUnavailable, match="incomplete"):
        asyncio.run(grok.complete([{"role": "user", "content": "Hello."}]))


def test_rejects_duplicate_modes_and_negative_duration():
    assert client.post("/api/trips/recommend", json={"options": [option(), option()]}).status_code == 422
    invalid = option()
    invalid["durationMinutes"] = -1
    assert client.post("/api/trips/recommend", json={"options": [invalid]}).status_code == 422
