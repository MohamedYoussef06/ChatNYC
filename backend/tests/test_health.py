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
