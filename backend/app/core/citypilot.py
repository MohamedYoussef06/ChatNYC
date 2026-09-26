from app.services.maps import route_hint


def plan_trip() -> dict[str, str]:
    origin = "Atlantic Av-Barclays Ctr"
    destination = "Prospect Park"
    return {
        "id": "trip-1",
        "title": "Saturday in Brooklyn",
        "origin": origin,
        "destination": destination,
        "summary": route_hint(origin, destination),
    }
