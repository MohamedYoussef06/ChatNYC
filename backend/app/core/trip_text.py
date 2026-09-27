from datetime import datetime


def format_trip_text(plan: dict) -> str:
    """Plain-text version of a stored itinerary, sized for an iMessage."""
    lines = [f"Your trip: {plan.get('title') or 'NYC trip plan'}"]
    subtitle = " · ".join(part for part in (plan.get("area"), plan.get("time_label") or plan.get("timeLabel")) if part)
    if subtitle:
        lines.append(subtitle)
    if plan.get("mode") and not plan.get("legs"):
        lines.append(plan["mode"])
    leave, arrive = _clock(plan.get("leave_at")), _clock(plan.get("arrive_at"))
    if leave and arrive:
        total = _minutes(plan.get("duration_seconds"))
        lines.append(f"Leave {leave}, arrive {arrive}" + (f" ({total})" if total else ""))
    if plan.get("on_time") is False and plan.get("arrive_by"):
        lines.append(f"Heads up: this gets you there after {_clock(plan['arrive_by'])}.")

    stops = plan.get("stops") or []
    if stops:
        lines.append("")
        for number, stop in enumerate(stops, 1):
            lines.append(f"{number}. {_stop(stop)}")
            if stop.get("note"):
                lines.append(f"   {stop['note']}")
        if plan.get("total"):
            budget = f" / {plan['budget']}" if plan.get("budget") else ""
            lines.append("")
            lines.append(f"Estimated total: {plan['total']}{budget}")
        return "\n".join(lines)

    steps = [_step(leg) for leg in plan.get("legs") or []]
    if not steps:
        steps = [_plain_step(item) for item in plan.get("steps") or []]
    if steps:
        lines.append("")
        lines.extend(f"{number}. {step}" for number, step in enumerate(steps, 1))

    alerts = [alert["header"] for alert in plan.get("alerts") or [] if alert.get("header")]
    if alerts:
        lines.append("")
        lines.append("Service alerts:")
        lines.extend(f"- {header}" for header in alerts)
    if plan.get("live"):
        lines.append("")
        lines.append("Train times include live MTA data.")
    return "\n".join(lines)


def _step(leg: dict) -> str:
    destination = (leg.get("to") or {}).get("label") or "your stop"
    duration = _minutes(leg.get("duration_seconds"))
    suffix = f" ({duration})" if duration else ""
    if leg.get("type") == "subway":
        origin = (leg.get("from") or {}).get("label") or "the station"
        if leg.get("headsign"):
            toward = f" toward {leg['headsign']}"
        elif leg.get("direction"):
            toward = f" {leg['direction']}"
        else:
            toward = ""
        stops = f", {leg['stops']} stops" if leg.get("stops") else ""
        board, off = _clock(leg.get("departure")), _clock(leg.get("arrival"))
        timing = f"{board}: " if board else ""
        arrival = f", arrive {off}" if off else ""
        return f"{timing}Take the {leg.get('route')} train{toward} from {origin} to {destination}{stops}{arrival}"
    if leg.get("type") == "transfer":
        return f"Transfer to {destination}{suffix}"
    return f"Walk to {destination}{suffix}"


def _stop(stop: dict) -> str:
    time = stop.get("time")
    category = stop.get("category")
    name = stop.get("name") or "Stop"
    neighborhood = stop.get("neighborhood")
    price = stop.get("price")
    head = f"{time} — " if time else ""
    mid = f"{category}: {name}" if category else name
    where = f" ({neighborhood})" if neighborhood else ""
    cost = f" · {price}" if price else ""
    return f"{head}{mid}{where}{cost}"


def _plain_step(item: object) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return str(item.get("text") or "Step")
    return "Step"


def _clock(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).strftime("%I:%M %p").lstrip("0")
    except ValueError:
        return value


def _minutes(seconds: int | None) -> str | None:
    if not seconds:
        return None
    return f"{max(1, round(seconds / 60))} min"
