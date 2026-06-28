"""
Cache-aside generik (Langkah 58).

get_or_set(key, compute_fn, ttl):
  - hit  → kembalikan nilai cache (from_cache=True), compute_fn TIDAK dipanggil.
  - miss → compute_fn(), simpan (ttl), kembalikan (from_cache=False).

Serialisasi JSON. Store di-inject (Redis/in-memory).
"""
from __future__ import annotations

import json


class Cache:
    def __init__(self, store, *, namespace: str = "psd"):
        self.store = store
        self.ns = namespace

    def _k(self, key: str) -> str:
        return f"{self.ns}:{key}"

    def get_or_set(self, key: str, compute_fn, *, ttl: int | None = None):
        full = self._k(key)
        raw = self.store.get(full)
        if raw is not None:
            return json.loads(raw), True
        value = compute_fn()
        self.store.set(full, json.dumps(value), ttl)
        return value, False

    def delete(self, key: str) -> None:
        self.store.delete(self._k(key))

    def delete_prefix(self, prefix: str) -> int:
        return self.store.delete_prefix(self._k(prefix))
