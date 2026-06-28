"""Kuota AI per tier gamifikasi (Langkah 57)."""
from __future__ import annotations

import time

QUOTAS = {"pemula": 20, "menengah": 100, "lanjut": 500}
DEFAULT_TIER = "pemula"


class QuotaExceeded(Exception):
    pass


def limit_for(tier: str | None) -> int:
    return QUOTAS.get((tier or "").lower(), QUOTAS[DEFAULT_TIER])


def check_and_consume(store, user_id: str, tier: str, *, cost: int = 1) -> dict:
    limit = limit_for(tier)
    used = store.incr(user_id, cost)
    if used > limit:
        store.incr(user_id, -cost)
        raise QuotaExceeded(f"Kuota AI tier '{tier}' habis ({limit}/jendela).")
    return {"used": used, "limit": limit, "remaining": limit - used}


class InMemoryWindowStore:
    def __init__(self, window_s: int = 86400, clock=time.time):
        self.window_s = window_s
        self.clock = clock
        self._data: dict[str, tuple[int, float]] = {}

    def incr(self, key: str, amount: int = 1) -> int:
        now = self.clock()
        count, start = self._data.get(key, (0, now))
        if now - start >= self.window_s:
            count, start = 0, now
        if amount == 0:
            return count
        count += amount
        self._data[key] = (count, start)
        return count


class RedisWindowStore:
    def __init__(self, redis_client, *, window_s: int = 86400, prefix: str = "assistant:quota:", clock=time.time):
        self._redis = redis_client
        self.window_s = window_s
        self.prefix = prefix
        self.clock = clock

    def _bucket_key(self, user_id: str) -> str:
        bucket = int(self.clock() / self.window_s)
        return f"{self.prefix}{user_id}:{bucket}"

    def incr(self, key: str, amount: int = 1) -> int:
        full = self._bucket_key(key)
        if amount == 0:
            val = self._redis.get(full)
            return int(val or 0)
        val = int(self._redis.incrby(full, amount))
        if val == amount:
            self._redis.expire(full, self.window_s + 60)
        return val
