from app.config import settings


def can_speak() -> bool:
    """True when an ElevenLabs key is present. Synthesis is not called."""
    return bool(settings.elevenlabs_api_key)
