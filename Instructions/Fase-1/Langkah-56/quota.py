"""
Kuota inferensi per tier gamifikasi (Langkah 56, sub-langkah 2).

Rem biaya: tiap tier punya jatah panggilan inferensi per jendela waktu. Konsisten
dengan strategi PSD (gamifikasi men-throttle biaya AI/compute).

Store di-abstraksi: nyata pakai Redis (INCR + EXPIRE per jendela); untuk dev/uji
disediakan InMemoryWindowStore.
"""
from __future__ import annotations

import time

# Jatah per jendela (mis. per jam). Sesuaikan dengan kapasitas & kebijakan.
QUOTAS = {"pemula": 100, "menengah": 500, "lanjut": 2000}
DEFAULT_TIER = "pemula"


class QuotaExceeded(Exception):
    pass


def limit_for(tier: str | None) -> int:
    return QUOTAS.get((tier or "").lower(), QUOTAS[DEFAULT_TIER])


def check_and_consume(store, user_id: str, tier: str, *, cost: int = 1) -> dict:
    """Tambah pemakaian; raise QuotaExceeded bila melewati jatah tier."""
    limit = limit_for(tier)
    used = store.incr(user_id, cost)
    if used > limit:
        store.incr(user_id, -cost)        # rollback agar tak menghukum ganda
        raise QuotaExceeded(f"Kuota tier '{tier}' habis ({limit}/jendela).")
    return {"used": used, "limit": limit, "remaining": limit - used}


class InMemoryWindowStore:
    """Store jendela sederhana untuk dev/uji. Produksi: ganti dengan Redis."""
    def __init__(self, window_s: int = 3600, clock=time.time):
        self.window_s = window_s
        self.clock = clock
        self._data: dict[str, tuple[int, float]] = {}   # key -> (count, window_start)

    def incr(self, key: str, amount: int = 1) -> int:
        now = self.clock()
        count, start = self._data.get(key, (0, now))
        if now - start >= self.window_s:          # jendela baru → reset
            count, start = 0, now
        count += amount
        self._data[key] = (count, start)
        return count
