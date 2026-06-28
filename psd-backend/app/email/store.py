"""Dedup & digest store Redis (Langkah 59)."""
from __future__ import annotations

import json
from typing import Protocol

from app.core.config import settings

_DEDUP_TTL = 60 * 60 * 24 * 7  # 7 hari


class DedupStore(Protocol):
    def try_claim(self, notification_id: str) -> bool: ...


class DigestStore(Protocol):
    def append(self, user_id: str, item: dict) -> None: ...
    def drain(self, user_id: str) -> list[dict]: ...
    def list_user_ids(self) -> list[str]: ...


class MemoryDedup:
    def __init__(self):
        self._seen: set[str] = set()

    def try_claim(self, notification_id: str) -> bool:
        if notification_id in self._seen:
            return False
        self._seen.add(notification_id)
        return True


class MemoryDigest:
    def __init__(self):
        self._items: dict[str, list[dict]] = {}

    def append(self, user_id: str, item: dict) -> None:
        self._items.setdefault(user_id, []).append(item)

    def drain(self, user_id: str) -> list[dict]:
        return self._items.pop(user_id, [])

    def list_user_ids(self) -> list[str]:
        return list(self._items.keys())


class RedisDedup:
    def __init__(self, redis_url: str):
        import redis

        self._r = redis.from_url(redis_url, decode_responses=True)

    def try_claim(self, notification_id: str) -> bool:
        key = f"email:dedup:{notification_id}"
        return bool(self._r.set(key, "1", nx=True, ex=_DEDUP_TTL))


class RedisDigest:
    def __init__(self, redis_url: str):
        import redis

        self._r = redis.from_url(redis_url, decode_responses=True)

    def _key(self, user_id: str) -> str:
        return f"email:digest:{user_id}"

    def append(self, user_id: str, item: dict) -> None:
        self._r.rpush(self._key(user_id), json.dumps(item, ensure_ascii=False))

    def drain(self, user_id: str) -> list[dict]:
        key = self._key(user_id)
        raw = self._r.lrange(key, 0, -1)
        if raw:
            self._r.delete(key)
        return [json.loads(x) for x in raw]

    def list_user_ids(self) -> list[str]:
        ids: list[str] = []
        for key in self._r.scan_iter("email:digest:*"):
            ids.append(key.split(":", 2)[-1])
        return ids


_dedup: DedupStore | None = None
_digest: DigestStore | None = None


def get_dedup() -> DedupStore:
    global _dedup
    if _dedup is None:
        if settings.PSD_EMAIL_REDIS:
            _dedup = RedisDedup(settings.REDIS_URL)
        else:
            _dedup = MemoryDedup()
    return _dedup


def get_digest_store() -> DigestStore:
    global _digest
    if _digest is None:
        if settings.PSD_EMAIL_REDIS:
            _digest = RedisDigest(settings.REDIS_URL)
        else:
            _digest = MemoryDigest()
    return _digest
