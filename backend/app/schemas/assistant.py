import json
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)
    context: dict | None = None
    conversation_id: str | None = Field(default=None, min_length=1, max_length=80)
    session_id: str | None = Field(default=None, min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$")

    @field_validator("context")
    @classmethod
    def bound_context(cls, value):
        if value is not None and len(json.dumps(value, ensure_ascii=False)) > 12000:
            raise ValueError("Context is too large")
        return value


class NextStopTrip(BaseModel):
    origin: str
    destination: str
    date_time: str
    time_type: Literal["arrive_by", "depart_at"]
    mode: Literal["transit", "drive", "walk"]


class OckAction(BaseModel):
    type: Literal["open_nextstop"] = "open_nextstop"
    label: str = "Open in NextStop"
    trip: NextStopTrip


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str | None = None
    persistence: Literal["backboard", "stateless"] | None = None
    actions: list[OckAction] | None = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    preview: str | None = None


class ConversationDetail(ConversationSummary):
    messages: list[ChatTurn]


class ConversationListResponse(BaseModel):
    available: bool
    conversations: list[ConversationSummary]
    scope: Literal["guest_session"] = "guest_session"
    message: str | None = None


class ConversationCreateRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=120, pattern=r"^[A-Za-z0-9._-]+$")


class ConversationCreateResponse(BaseModel):
    id: str
    scope: Literal["guest_session"] = "guest_session"


class MemoryRead(BaseModel):
    id: str
    content: str
    created_at: str | None = None
    updated_at: str | None = None


class MemoryListResponse(BaseModel):
    available: bool
    memories: list[MemoryRead]
    scope: Literal["guest_session"] = "guest_session"
    message: str | None = None
