"""Store cache — in-memory (dev/uji) & Redis (produksi)."""
from __future__ import annotations

import time


class InMemoryTTLStore:
    def __init__(self, clock=time.time):
        self._d: dict[str, tuple[str, float | None]] = {}
        self.clock = clock

    def get(self, key: str) -> str | None:
        v = self._d.get(key)
        if v is None:
            return None
        value, exp = v
        if exp is not None and self.clock() >= exp:
            self._d.pop(key, None)
            return None
        return value

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        exp = (self.clock() + ttl) if ttl else None
        self._d[key] = (value, exp)

    def delete(self, key: str) -> None:
        self._d.pop(key, None)

    def delete_prefix(self, prefix: str) -> int:
        keys = [k for k in self._d if k.startswith(prefix)]
        for k in keys:
            self._d.pop(k, None)
        return len(keys)


class RedisTTLStore:
    """Redis store dengan delete_prefix via SCAN (bukan KEYS)."""

    def __init__(self, redis_client):
        self._redis = redis_client

    def get(self, key: str) -> str | None:
        return self._redis.get(key)

    def set(self, key: str, value: str, ttl: int | None = None) -> None:
        if ttl:
            self._redis.setex(key, ttl, value)
        else:
            self._redis.set(key, value)

    def delete(self, key: str) -> None:
        self._redis.delete(key)

    def delete_prefix(self, prefix: str) -> int:
        removed = 0
        cursor = 0
        while True:
            cursor, keys = self._redis.scan(cursor=cursor, match=f"{prefix}*", count=100)
            if keys:
                removed += int(self._redis.delete(*keys))
            if cursor == 0:
                break
        return removed
