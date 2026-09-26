from app.config import settings


def memory_note(user_name: str) -> str:
    """Return a local memory note. A configured key does not call Backboard yet."""
    if settings.backboard_api_key:
        return f"Backboard key is set, but memory sync is not wired yet for {user_name}."
    return f"Local hello-world profile for {user_name}."
