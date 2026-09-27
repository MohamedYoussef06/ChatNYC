"""Reserved WebSocket boundary.

The MVP assistant uses POST /api/assistant/chat. A realtime socket remains
deliberately unmounted until its message protocol and lifecycle are defined.
"""

from fastapi import APIRouter

router = APIRouter()
