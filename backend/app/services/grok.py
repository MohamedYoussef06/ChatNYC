"""Grok / xAI client for chat and travel-mode recommendations."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import settings

XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions"
DEFAULT_MODEL = "grok-3-mini"


def _api_key() -> str | None:
    return settings.effective_grok_api_key


def _chat_completion(messages: list[dict[str, str]], *, temperature: float = 0.2) -> str | None:
    key = _api_key()
    if not key:
        return None
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.grok_model or DEFAULT_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(XAI_CHAT_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError, KeyError):
        return None

    choices = data.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    return content.strip() if isinstance(content, str) else None


def complete(message: str) -> str:
    """Reply via Grok when GROK_API_KEY is set; otherwise a local hello-world echo."""
    if not _api_key():
        return f"Hello from CityPilot. You said: {message}"

    reply = _chat_completion(
        [
            {
                "role": "system",
                "content": (
                    "You are CityPilot, a concise NYC trip companion. "
                    "Answer helpfully in a few short sentences."
                ),
            },
            {"role": "user", "content": message},
        ],
        temperature=0.4,
    )
    if reply:
        return reply
    return (
        "Grok is configured but the live request failed. "
        f"You said: {message}"
    )


def _extract_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def recommend_mode(
    origin: str,
    destination: str,
    options: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """
    Ask Grok to pick walking / driving / transit given time, cost, and ease.

    Returns None when the API key is missing or the call fails so callers can
    skip highlighting without breaking the mode list.
    """
    if not _api_key():
        return None
    if not options:
        return None

    option_lines = []
    for opt in options:
        option_lines.append(
            (
                f"- mode={opt['mode']}: duration_minutes={opt['duration_minutes']}, "
                f"cost_usd={opt['cost_usd']}, transfers={opt['transfers']}, "
                f"wait_minutes={opt['wait_minutes']}, ease_score={opt['ease_score']}/10, "
                f"summary={opt['summary']}"
            )
        )

    user_prompt = (
        f"Trip from {origin} to {destination}.\n"
        "Compare these travel options and recommend exactly one mode.\n"
        "Weigh travel time, cost, and ease of transport "
        "(transfers, wait times, walking burden).\n"
        "Options:\n"
        + "\n".join(option_lines)
        + "\n\nRespond with JSON only, no markdown:\n"
        '{"recommended_mode":"walking|driving|transit","reason":"one short sentence"}'
    )

    reply = _chat_completion(
        [
            {
                "role": "system",
                "content": (
                    "You are CityPilot's travel advisor for New York City. "
                    "Pick the single best mode and explain briefly. "
                    "Output valid JSON only."
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )
    if not reply:
        return None

    parsed = _extract_json(reply)
    if not parsed:
        return None

    mode = str(parsed.get("recommended_mode", "")).strip().lower()
    reason = str(parsed.get("reason", "")).strip()
    valid = {opt["mode"] for opt in options}
    if mode not in valid:
        return None
    if not reason:
        reason = f"Grok recommends {mode} for this trip."

    return {
        "recommended_mode": mode,
        "reason": reason,
        "source": "grok",
    }
