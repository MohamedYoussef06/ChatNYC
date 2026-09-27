from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_discover() -> None:
    response = client.get("/api/discover")
    assert response.status_code == 200
    places = response.json()
    assert places[0]["name"] == "Prospect Park"
    assert places[0]["neighborhood"] == "Brooklyn"


def test_trips_multimodal() -> None:
    response = client.get("/api/trips")
    assert response.status_code == 200
    trips = response.json()
    assert len(trips) == 1
    trip = trips[0]
    assert trip["origin"] == "Atlantic Av-Barclays Ctr"
    assert trip["destination"] == "Prospect Park"
    modes = {option["mode"] for option in trip["options"]}
    assert modes == {"walking", "driving", "transit"}
    for option in trip["options"]:
        assert option["duration_minutes"] > 0
        assert "summary" in option
    # Without GROK_API_KEY the recommendation is omitted, not an error.
    assert trip["recommendation"] is None
    assert "GROK_API_KEY" in trip["summary"]
