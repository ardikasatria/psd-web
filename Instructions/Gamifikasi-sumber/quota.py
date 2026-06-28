"""
MATRIKS KUOTA TERPUSAT per (fitur, tier) — SATU sumber kebenaran.

Menggantikan tabel kuota yang tersebar di brief 52/52b/56/57. Tiap fitur
MEMANGGIL `quota(key, tier)` — bukan mendefinisikan angkanya sendiri.

`check_and_consume` = pengecek kuota berjendela generik (rem biaya) untuk fitur
yang dibatasi laju (inferensi, pesan AI). Store: Redis (produksi) / in-memory (uji).
"""
from __future__ import annotations

import time

from .tiers import DEFAULT_TIER, TIER_NAMES

# key fitur → {tier: nilai}. Nilai numerik ATAU enum (mis. runtime).
QUOTA_MATRIX: dict[str, dict[str, object]] = {
    # Notebook (Langkah 52b)
    "notebook.max_notebooks":         {"pemula": 3,  "menengah": 10, "lanjut": 50},
    "notebook.max_concurrent_kernels":{"pemula": 1,  "menengah": 2,  "lanjut": 4},
    "notebook.runtime":               {"pemula": "browser", "menengah": "both", "lanjut": "both"},
    # JupyterHub kernel server (Langkah 52)
    "jupyter.cpu":                    {"pemula": 1.0, "menengah": 2.0, "lanjut": 4.0},
    "jupyter.mem_gb":                 {"pemula": 2,  "menengah": 4,  "lanjut": 8},
    "jupyter.idle_minutes":           {"pemula": 30, "menengah": 60, "lanjut": 120},
    # Serving inferensi (Langkah 56) — per jam
    "inference.per_hour":             {"pemula": 100, "menengah": 500, "lanjut": 2000},
    # AI asisten (Langkah 57) — per hari
    "ai.messages_per_day":            {"pemula": 20, "menengah": 100, "lanjut": 500},
}


def quota(feature_key: str, tier: str):
    """Nilai kuota untuk (fitur, tier). Fallback ke nilai tier default."""
    row = QUOTA_MATRIX[feature_key]
    t = (tier or "").lower()
    return row.get(t, row.get(DEFAULT_TIER))


class QuotaExceeded(Exception):
    pass


def check_and_consume(store, feature_key: str, user_id: str, tier: str, *,
                      cost: int = 1) -> dict:
    """Tegakkan kuota berjendela dari matriks. Raise QuotaExceeded bila lewat."""
    limit = quota(feature_key, tier)
    if not isinstance(limit, (int, float)):
        raise ValueError(f"{feature_key} bukan kuota numerik.")
    key = f"{feature_key}:{user_id}"
    used = store.incr(key, cost)
    if used > limit:
        store.incr(key, -cost)
        raise QuotaExceeded(f"Kuota '{feature_key}' tier '{tier}' habis ({int(limit)}).")
    return {"used": used, "limit": limit, "remaining": limit - used}


def validate_matrix() -> list[str]:
    """Periksa semua tier kanonik tercakup di tiap baris (cegah lubang)."""
    problems = []
    for key, row in QUOTA_MATRIX.items():
        missing = [t for t in TIER_NAMES if t not in row]
        if missing:
            problems.append(f"{key}: tier hilang {missing}")
    return problems


class InMemoryWindowStore:
    def __init__(self, window_s: int = 3600, clock=time.time):
        self.window_s, self.clock = window_s, clock
        self._d: dict[str, tuple[int, float]] = {}

    def incr(self, key: str, amount: int = 1) -> int:
        now = self.clock()
        count, start = self._d.get(key, (0, now))
        if now - start >= self.window_s:
            count, start = 0, now
        count += amount
        self._d[key] = (count, start)
        return count
