"""
Pengukuran latensi (Langkah 58) — "UKUR DULU, baru cache".

Optimasi reaktif: pakai registri ini untuk menemukan titik yang TERBUKTI lambat
sebelum menambah cache/index. should_cache() = gerbang berbasis bukti.
"""
from __future__ import annotations

import time


def _percentile(sorted_vals: list[float], q: float) -> float:
    n = len(sorted_vals)
    if n == 1:
        return sorted_vals[0]
    idx = q * (n - 1)
    lo, hi = int(idx), min(int(idx) + 1, n - 1)
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


class Registry:
    def __init__(self):
        self._samples: dict[str, list[float]] = {}

    def record(self, name: str, ms: float) -> None:
        self._samples.setdefault(name, []).append(ms)

    def stats(self, name: str) -> dict | None:
        xs = sorted(self._samples.get(name, []))
        if not xs:
            return None
        return {
            "count": len(xs),
            "mean": sum(xs) / len(xs),
            "p50": _percentile(xs, 0.50),
            "p95": _percentile(xs, 0.95),
            "max": xs[-1],
        }

    def is_slow(self, name: str, threshold_ms: float, *, pct: str = "p95") -> bool:
        s = self.stats(name)
        return bool(s) and s[pct] >= threshold_ms

    def should_cache(self, name: str, *, threshold_ms: float = 200.0,
                     min_samples: int = 30, pct: str = "p95") -> bool:
        """Rekomendasi caching HANYA bila ada cukup bukti lambat."""
        s = self.stats(name)
        return bool(s) and s["count"] >= min_samples and s[pct] >= threshold_ms


class Stopwatch:
    """Context manager: catat durasi blok ke registri."""
    def __init__(self, registry: Registry, name: str, *, clock=time.perf_counter):
        self.registry, self.name, self.clock = registry, name, clock

    def __enter__(self):
        self._t0 = self.clock()
        return self

    def __exit__(self, *exc):
        self.registry.record(self.name, (self.clock() - self._t0) * 1000.0)
        return False
