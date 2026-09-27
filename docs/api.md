# API

Base URL: `http://localhost:8000`

Hello-world responses are canned. Provider keys do not trigger live HTTP calls.

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

```json
[
  {
    "id": "trip-1",
    "title": "Saturday in Brooklyn",
    "origin": "Atlantic Av-Barclays Ctr",
    "destination": "Prospect Park",
    "summary": "Take the subway from Atlantic Av-Barclays Ctr toward Prospect Park."
  }
]
```

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

Response:

```json
{ "reply": "Hello from CityPilot. You said: How do I get to Prospect Park?" }
```

If `ELEVENLABS_API_KEY` is set, the reply notes that voice is not enabled. No audio is generated.

## WebSocket /ws

Send a text frame. The server replies with the same hello-world string as `POST /api/assistant/chat`, without the ElevenLabs note.
