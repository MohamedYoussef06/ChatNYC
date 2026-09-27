from app.services import grok, maps


def plan_trip() -> dict:
    origin = "Atlantic Av-Barclays Ctr"
    destination = "Prospect Park"
    options = maps.multimodal_routes(origin, destination)
    recommendation = grok.recommend_mode(origin, destination, options)

    if recommendation:
        recommended = recommendation["recommended_mode"]
        reason = recommendation["reason"]
        summary = f"Grok recommends {recommended}: {reason}"
    else:
        transit = next((o for o in options if o["mode"] == "transit"), options[0])
        summary = (
            f"{transit['summary']} "
            "(Set GROK_API_KEY to get an AI-highlighted recommendation.)"
        )
        recommendation = None

    return {
        "id": "trip-1",
        "title": "Saturday in Brooklyn",
        "origin": origin,
        "destination": destination,
        "summary": summary,
        "options": options,
        "recommendation": recommendation,
    }
