from typing import TypedDict

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(description="user 或 assistant")
    content: str


class ChatRequest(BaseModel):
    message: str
    base_url: str = "https://aiplatform.njsrd.com/llm/v1"
    api_key: str
    model: str
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


class ChatState(TypedDict):
    messages: list
    reply: str


class JudgeRequest(BaseModel):
    word: str
    definition: str
    root: str
    root_meaning: str
    user_explanation: str
    base_url: str = "https://aiplatform.njsrd.com/llm/v1"
    api_key: str
    model: str


class JudgeResponse(BaseModel):
    verdict: str
    feedback: str
