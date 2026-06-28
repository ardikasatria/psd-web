"""
Kuota AI per tier gamifikasi (Langkah 57, sub-langkah 2).

Rem biaya: penggunaan OpenAI di-gate kuota gamifikasi. Tiap tier punya jatah
pesan asisten per jendela. Produksi: store Redis (INCR+EXPIRE). Dev/uji: in-memory.

(Alternatif: anggaran TOKEN, bukan jumlah pesan — antarmuka sama, ganti satuan.)
"""
from __future__ import annotations

import time

QUOTAS = {"pemula": 20, "menengah": 100, "lanjut": 500}   # pesan / jendela
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
        count += amount
        self._data[key] = (count, start)
        return count
