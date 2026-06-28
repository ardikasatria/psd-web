"""Kuota AI — delegasi ke psd_gamification."""
from __future__ import annotations

import time

from psd_gamification import quota as gq

FEATURE = "ai.messages_per_day"
QuotaExceeded = gq.QuotaExceeded


def limit_for(tier_slug: str | None) -> int:
    return int(gq.quota(FEATURE, tier_slug or "pemula"))


def check_and_consume(store, user_id: str, tier_slug: str, *, cost: int = 1) -> dict:
    return gq.check_and_consume(store, FEATURE, user_id, tier_slug, cost=cost)


class InMemoryWindowStore:
    def __init__(self, window_s: int = 86400, clock=time.time):
        self._inner = gq.InMemoryWindowStore(window_s=window_s, clock=clock)

    def incr(self, key: str, amount: int = 1) -> int:
        return self._inner.incr(key, amount)


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
