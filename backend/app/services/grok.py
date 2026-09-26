from app.config import settings


def complete(message: str) -> str:
    """Return a hello-world reply. A configured key does not call Grok yet."""
    if settings.grok_api_key:
        return f"Grok key is set, but the live client is not wired yet. You said: {message}"
    return f"Hello from CityPilot. You said: {message}"
