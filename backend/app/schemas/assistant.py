import json
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

    @field_validator("context")
    @classmethod
    def bound_context(cls, value):
        if value is not None and len(json.dumps(value, ensure_ascii=False)) > 12000:
            raise ValueError("Context is too large")
        return value


class ChatResponse(BaseModel):
    reply: str
