"""
Store cache (Langkah 58). Dev/uji: InMemoryTTLStore. Produksi: Redis.

Antarmuka minimal: get / set(ttl) / delete / delete_prefix.
Catatan: delete_prefix di Redis pakai SCAN+DEL (hindari KEYS di produksi).
"""
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
