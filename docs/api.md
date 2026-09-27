# API

Base URL: `http://localhost:8000`

Provider keys enable live calls where wired. Without keys, routes still return multimodal estimates and skip Grok recommendations.

## GET /health

```json
{ "status": "ok" }
```

## GET /api/discover

```json
[
  {
    "id": "place-1",
    "name": "Prospect Park",
    "neighborhood": "Brooklyn",
    "summary": "Prospect Park is a hello-world suggestion, not a live open-data result."
  }
]
```

## GET /api/trips

Returns the CityPilot demo trip with **walking**, **driving**, and **transit** options. When `GROK_API_KEY` is set, `recommendation` highlights one mode using travel time, cost, and ease (transfers / waits).

```json
[
  {
    "id": "trip-1",
    "title": "Saturday in Brooklyn",
    "origin": "Atlantic Av-Barclays Ctr",
    "destination": "Prospect Park",
    "summary": "Grok recommends transit: …",
    "options": [
      {
        "mode": "walking",
        "duration_minutes": 28,
        "distance_meters": 2100,
        "cost_usd": 0.0,
        "transfers": 0,
        "wait_minutes": 0,
        "ease_score": 7,
        "summary": "Walk via Flatbush Ave / Park Place (~28 min, free).",
        "source": "estimate"
      },
      {
        "mode": "driving",
        "duration_minutes": 12,
        "distance_meters": 2400,
        "cost_usd": 8.5,
        "transfers": 0,
        "wait_minutes": 0,
        "ease_score": 6,
        "summary": "Drive via Flatbush Ave (~12 min; parking/tolls ~$8–10).",
        "source": "estimate"
      },
      {
        "mode": "transit",
        "duration_minutes": 18,
        "distance_meters": 2600,
        "cost_usd": 2.9,
        "transfers": 0,
        "wait_minutes": 4,
        "ease_score": 8,
        "summary": "B/Q toward Prospect Park (~18 min door-to-door, 1 seat, ~4 min wait).",
        "source": "estimate"
      }
    ],
    "recommendation": {
      "recommended_mode": "transit",
      "reason": "Fast enough, cheap, and easier than driving or a long walk.",
      "source": "grok"
    }
  }
]
```

Without `GROK_API_KEY`, `recommendation` is `null` and `summary` notes how to enable it. With `MAPS_API_KEY`, option `source` becomes `"google"` when Directions succeeds.

## GET /api/users/me

```json
{
  "id": "user-1",
  "name": "Alex Rivera",
  "neighborhood": "Prospect Heights"
}
```

## POST /api/assistant/chat

Request:

```json
{ "message": "How do I get to Prospect Park?" }
```

Response (no key):

```json
{ "reply": "Hello from CityPilot. You said: How do I get to Prospect Park?" }
```

With `GROK_API_KEY`, the reply comes from the xAI chat completions API.

If `ELEVENLABS_API_KEY` is set, the reply notes that voice is not enabled. No audio is generated.

## WebSocket /ws

Send a text frame. The server replies with the same string as `POST /api/assistant/chat`, without the ElevenLabs note.
