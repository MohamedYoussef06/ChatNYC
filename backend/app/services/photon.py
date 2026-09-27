import httpx

from app.config import settings


class MessagingError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def send_imessage(phone: str, text: str) -> dict:
    """Text `phone` through the messaging service, which owns the Photon Spectrum connection."""
    headers = {"Authorization": f"Bearer {settings.messaging_api_key}"} if settings.messaging_api_key else {}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.messaging_url.rstrip('/')}/messages",
                json={"phone": phone, "text": text},
                headers=headers,
            )
    except httpx.TransportError as exc:
        raise MessagingError("Messaging service is not reachable. Start it with `npm run dev` in messaging/.", 503) from exc
    if response.status_code != 200:
        try:
            detail = response.json().get("detail")
        except ValueError:
            detail = None
        raise MessagingError(detail or f"Messaging service returned {response.status_code}")
    return response.json()
