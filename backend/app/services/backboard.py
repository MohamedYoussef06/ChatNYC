"""Backboard persistence for Ock.

Backboard is a conversation and memory store. It never produces the answer
returned to a ChatNYC client; Grok remains Ock's response engine.
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from backboard import BackboardClient

from app.config import settings
from app.schemas.assistant import ChatTurn, MemoryRead

logger = logging.getLogger(__name__)

_ASSISTANT_PREFIX = "ChatNYC Ock guest"
_TITLE_WORDS = 8


class BackboardUnavailable(RuntimeError):
    """Backboard could not service the request."""


class ConversationNotFound(LookupError):
    """The requested conversation is not in this session's scope."""


@dataclass(frozen=True)
class StoredConversation:
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatTurn]
    preview: str | None = None


def is_configured() -> bool:
    return bool(settings.backboard_api_key.strip())


def derive_title(message: str) -> str:
    """Create a useful, deterministic title without another model request."""
    cleaned = re.sub(r"[`*_#>\[\]()]+", " ", message)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .?!,;:")
    route = re.search(
        r"\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+(?:today|tomorrow|tonight|at|by)\b|[.?!]|$)",
        cleaned,
        re.IGNORECASE,
    )
    if route:
        title = f"{route.group(1).strip()} to {route.group(2).strip()}"
    else:
        words = cleaned.split()
        title = " ".join(words[:_TITLE_WORDS])
        if len(words) > _TITLE_WORDS:
            title += "…"
    return (title or "New Ock conversation")[:60]


def _assistant_name(session_id: str) -> str:
    digest = hashlib.sha256(session_id.encode("utf-8")).hexdigest()[:24]
    return f"{_ASSISTANT_PREFIX} {digest}"


def _client() -> BackboardClient:
    if not is_configured():
        raise BackboardUnavailable("Backboard is not configured")
    return BackboardClient(settings.backboard_api_key, timeout=8)


async def _assistant(client: BackboardClient, session_id: str):
    name = _assistant_name(session_id)
    assistants = await client.list_assistants(name=name, limit=10)
    for assistant in assistants:
        if assistant.name == name:
            return assistant
    return await client.create_assistant(
        name=name,
        description="ChatNYC Ock guest-session conversation and memory store.",
        system_prompt=(
            "Store conversation messages and useful mobility preferences. "
            "Do not answer the user; Grok generates all Ock responses."
        ),
        custom_fact_extraction_prompt=(
            "Extract only durable, user-stated mobility preferences, recurring places, "
            "and accessibility needs. Do not store transient trip requests, secrets, "
            "payment data, precise live location, or assistant-generated claims."
        ),
    )


async def _scoped_thread(client: BackboardClient, assistant_id: Any, conversation_id: str):
    try:
        requested = UUID(conversation_id)
    except (TypeError, ValueError) as exc:
        raise ConversationNotFound(conversation_id) from exc
    threads = await client.list_threads_for_assistant(assistant_id, limit=100)
    if not any(thread.thread_id == requested for thread in threads):
        raise ConversationNotFound(conversation_id)
    return await client.get_thread(requested)


def _message_role(message: Any) -> str | None:
    metadata = message.metadata_ or {}
    role = metadata.get("chatnyc_role")
    if role in {"user", "assistant"}:
        return role
    raw_role = getattr(message.role, "value", message.role)
    return raw_role if raw_role in {"user", "assistant"} else None


def _turns(thread: Any) -> list[ChatTurn]:
    turns: list[ChatTurn] = []
    for message in thread.messages:
        role = _message_role(message)
        content = (message.content or "").strip()
        if role and content:
            turns.append(ChatTurn(role=role, content=content[:2000]))
    return turns


def _conversation(thread: Any) -> StoredConversation:
    messages = _turns(thread)
    raw_messages = list(thread.messages)
    first_user = next((message for message in raw_messages if _message_role(message) == "user"), None)
    metadata = (first_user.metadata_ or {}) if first_user else {}
    title = metadata.get("chatnyc_title")
    if not isinstance(title, str) or not title.strip():
        title = derive_title(first_user.content) if first_user and first_user.content else "New Ock conversation"
    updated_at = max((message.created_at for message in raw_messages), default=thread.created_at)
    preview = messages[-1].content[:120] if messages else None
    return StoredConversation(
        id=str(thread.thread_id),
        title=title[:60],
        created_at=thread.created_at,
        updated_at=updated_at,
        messages=messages,
        preview=preview,
    )


async def create_conversation(session_id: str) -> str:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            thread = await client.create_thread(assistant.assistant_id)
            return str(thread.thread_id)
    except BackboardUnavailable:
        raise
    except Exception as exc:
        logger.warning("Backboard conversation creation failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Conversation storage is unavailable") from exc


async def get_conversation(session_id: str, conversation_id: str) -> StoredConversation:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            thread = await _scoped_thread(client, assistant.assistant_id, conversation_id)
            return _conversation(thread)
    except (BackboardUnavailable, ConversationNotFound):
        raise
    except Exception as exc:
        logger.warning("Backboard conversation retrieval failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Conversation storage is unavailable") from exc


async def list_conversations(session_id: str) -> list[StoredConversation]:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            threads = await client.list_threads_for_assistant(assistant.assistant_id, limit=100)
            conversations = []
            for listed in threads:
                conversations.append(_conversation(await client.get_thread(listed.thread_id)))
            return sorted(conversations, key=lambda item: item.updated_at, reverse=True)
    except BackboardUnavailable:
        raise
    except Exception as exc:
        logger.warning("Backboard conversation listing failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Conversation storage is unavailable") from exc


def _memory(item: Any) -> MemoryRead:
    if isinstance(item, dict):
        return MemoryRead(
            id=str(item.get("id", "")),
            content=str(item.get("content", ""))[:2000],
            created_at=item.get("created_at"),
            updated_at=item.get("updated_at"),
        )
    return MemoryRead(
        id=str(item.id),
        content=item.content[:2000],
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


async def relevant_memories(session_id: str, query: str, limit: int = 5) -> list[MemoryRead]:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            result = await client.search_memories(assistant.assistant_id, query=query, limit=limit)
            raw = result.get("memories", []) if isinstance(result, dict) else []
            return [_memory(item) for item in raw]
    except BackboardUnavailable:
        raise
    except Exception as exc:
        logger.warning("Backboard memory search failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Memory is unavailable") from exc


async def list_memories(session_id: str) -> list[MemoryRead]:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            response = await client.get_memories(assistant.assistant_id, page=1, page_size=100)
            return [_memory(item) for item in response.memories]
    except BackboardUnavailable:
        raise
    except Exception as exc:
        logger.warning("Backboard memory listing failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Memory is unavailable") from exc


async def delete_memory(session_id: str, memory_id: str) -> None:
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            response = await client.get_memories(assistant.assistant_id, page=1, page_size=100)
            if not any(str(item.id) == memory_id for item in response.memories):
                raise ConversationNotFound(memory_id)
            await client.delete_memory(assistant.assistant_id, memory_id)
    except (BackboardUnavailable, ConversationNotFound):
        raise
    except Exception as exc:
        logger.warning("Backboard memory deletion failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Memory is unavailable") from exc


async def persist_exchange(
    session_id: str,
    conversation_id: str | None,
    user_message: str,
    assistant_message: str,
) -> str:
    """Persist both sides without asking Backboard to generate a response."""
    try:
        async with _client() as client:
            assistant = await _assistant(client, session_id)
            if conversation_id:
                thread = await _scoped_thread(client, assistant.assistant_id, conversation_id)
            else:
                thread = await client.create_thread(assistant.assistant_id)
            await client.add_message(
                thread.thread_id,
                content=user_message,
                send_to_llm="false",
                memory="Auto",
                metadata={"chatnyc_role": "user", "chatnyc_title": derive_title(user_message)},
            )
            await client.add_message(
                thread.thread_id,
                content=assistant_message,
                send_to_llm="false",
                memory="off",
                metadata={"chatnyc_role": "assistant"},
            )
            return str(thread.thread_id)
    except (BackboardUnavailable, ConversationNotFound):
        raise
    except Exception as exc:
        logger.warning("Backboard persistence failed: %s", type(exc).__name__)
        raise BackboardUnavailable("Conversation storage is unavailable") from exc


def memory_note(_user_name: str) -> None:
    """Legacy compatibility hook; Ock memory is handled by the async service."""
    return None
