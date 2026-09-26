from app.services.nyc_open_data import context_note


def suggest_places() -> list[dict[str, str]]:
    name = "Prospect Park"
    return [
        {
            "id": "place-1",
            "name": name,
            "neighborhood": "Brooklyn",
            "summary": context_note(name),
        }
    ]
