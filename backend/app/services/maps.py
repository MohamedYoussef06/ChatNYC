from app.config import settings


def route_hint(origin: str, destination: str) -> str:
    """Return a transit hint. A configured key does not call a maps API yet."""
    if settings.maps_api_key:
        return f"Maps key is set; live routing is not wired yet ({origin} to {destination})."
    return f"Take the subway from {origin} toward {destination}."
