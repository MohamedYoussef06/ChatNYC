import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
    ConversationCreateRequest,
    ConversationCreateResponse,
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
    MemoryListResponse,
)
from app.services import backboard
from app.services.grok import GrokUnavailable, complete, is_configured
from app.services.ock import run_chat

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse, response_model_exclude_none=True)
async def chat(body: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    if not is_configured():
        raise HTTPException(503, "Ock is temporarily unavailable.")
    logger.info("Ock request received session=%s conversation=%s", bool(body.session_id), bool(body.conversation_id))
    try:
        result = await run_chat(body, db, complete)
        return ChatResponse(
            reply=result.reply,
            conversation_id=result.conversation_id,
            persistence=result.persistence,
        )
    except backboard.ConversationNotFound:
        raise HTTPException(404, "Ock conversation not found.") from None
    except GrokUnavailable:
        raise HTTPException(502, "Ock is temporarily unavailable. Please try again.") from None


@router.post("/conversations", response_model=ConversationCreateResponse)
async def create_conversation(body: ConversationCreateRequest) -> ConversationCreateResponse:
    try:
        conversation_id = await backboard.create_conversation(body.session_id)
        return ConversationCreateResponse(id=conversation_id)
    except backboard.BackboardUnavailable:
        raise HTTPException(503, "Ock chat history is temporarily unavailable.") from None


@router.get("/conversations", response_model=ConversationListResponse)
async def conversations(
    session_id: str = Query(min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$"),
) -> ConversationListResponse:
    try:
        stored = await backboard.list_conversations(session_id)
        return ConversationListResponse(
            available=True,
            conversations=[
                ConversationSummary(
                    id=item.id,
                    title=item.title,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                    preview=item.preview,
                )
                for item in stored
            ],
        )
    except backboard.BackboardUnavailable:
        return ConversationListResponse(
            available=False,
            conversations=[],
            message="Ock chat history is temporarily unavailable.",
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def conversation(
    conversation_id: str = Path(min_length=1, max_length=80),
    session_id: str = Query(min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$"),
) -> ConversationDetail:
    try:
        item = await backboard.get_conversation(session_id, conversation_id)
        return ConversationDetail(
            id=item.id,
            title=item.title,
            created_at=item.created_at,
            updated_at=item.updated_at,
            preview=item.preview,
            messages=item.messages,
        )
    except backboard.ConversationNotFound:
        raise HTTPException(404, "Ock conversation not found.") from None
    except backboard.BackboardUnavailable:
        raise HTTPException(503, "Ock chat history is temporarily unavailable.") from None


@router.get("/memories", response_model=MemoryListResponse)
async def memories(
    session_id: str = Query(min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$"),
) -> MemoryListResponse:
    try:
        return MemoryListResponse(available=True, memories=await backboard.list_memories(session_id))
    except backboard.BackboardUnavailable:
        return MemoryListResponse(
            available=False,
            memories=[],
            message="Ock memory is temporarily unavailable.",
        )


@router.delete("/memories/{memory_id}", status_code=204)
async def forget_memory(
    memory_id: str = Path(min_length=1, max_length=200),
    session_id: str = Query(min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$"),
) -> Response:
    try:
        await backboard.delete_memory(session_id, memory_id)
        return Response(status_code=204)
    except backboard.ConversationNotFound:
        raise HTTPException(404, "Ock memory not found.") from None
    except backboard.BackboardUnavailable:
        raise HTTPException(503, "Ock memory is temporarily unavailable.") from None
