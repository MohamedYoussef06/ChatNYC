from app.services.backboard import memory_note


def current_user() -> dict[str, str]:
    name = "Alex Rivera"
    return {
        "id": "user-1",
        "name": name,
        "neighborhood": "Prospect Heights",
        "note": memory_note(name),
    }
