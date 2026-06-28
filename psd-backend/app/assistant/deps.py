"""Dependency singleton asisten (Langkah 57)."""
from __future__ import annotations

from app.assistant.assistant import AIAssistant
from app.assistant.quota import InMemoryWindowStore, RedisWindowStore
from app.core.ai.client import chat_messages
from app.core.config import settings

_store = None
_assistant: AIAssistant | None = None


def get_quota_store():
    global _store
    if _store is not None:
        return _store
    if settings.PSD_ASSISTANT_REDIS_QUOTA:
        import redis

        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _store = RedisWindowStore(client)
    else:
        _store = InMemoryWindowStore()
    return _store


def get_assistant() -> AIAssistant:
    global _assistant
    if _assistant is None:
        _assistant = AIAssistant(chat_messages, get_quota_store())
    return _assistant
