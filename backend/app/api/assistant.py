from fastapi import APIRouter

from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.elevenlabs import can_speak
from app.services.grok import complete

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    reply = complete(body.message)
    if can_speak():
        reply = f"{reply} Voice replies are not enabled in this scaffold."
    return ChatResponse(reply=reply)
