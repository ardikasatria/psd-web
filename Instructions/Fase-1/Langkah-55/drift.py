"""
Perhitungan drift distribusi (Langkah 55, sub-langkah 2).

Murni Python (tanpa numpy/scipy) agar mudah diuji & ringan. Untuk skala besar,
ganti dengan numpy/scipy (lihat brief) — antarmuka tetap.

Metrik:
  - PSI (Population Stability Index) numerik & kategorik.
  - KS (Kolmogorov–Smirnov) statistik untuk numerik.
Ambang PSI standar: <0.1 stabil, 0.1–0.25 sedang, >0.25 signifikan.
"""
from __future__ import annotations

import bisect
import math


def _percentile(sorted_vals: list[float], q: float) -> float:
    n = len(sorted_vals)
    if n == 1:
        return sorted_vals[0]
    idx = q * (n - 1)
    lo, hi = math.floor(idx), math.ceil(idx)
    if lo == hi:
        return sorted_vals[int(idx)]
    frac = idx - lo
    return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac


def quantile_edges(ref: list[float], bins: int = 10) -> list[float]:
    s = sorted(ref)
    edges = [_percentile(s, i / bins) for i in range(1, bins)]
    uniq: list[float] = []
    for e in edges:
        if not uniq or e > uniq[-1]:
            uniq.append(e)
    return uniq


def _proportions(data: list[float], edges: list[float]) -> list[float]:
    counts = [0] * (len(edges) + 1)
    for x in data:
        counts[bisect.bisect_right(edges, x)] += 1
    n = len(data) or 1
    return [c / n for c in counts]


def psi_numeric(ref: list[float], cur: list[float], *, bins: int = 10,
                eps: float = 1e-6) -> float:
    edges = quantile_edges(ref, bins)
    ref_p = _proportions(ref, edges)
    cur_p = _proportions(cur, edges)
    return sum((c - r) * math.log((c + eps) / (r + eps)) for r, c in zip(ref_p, cur_p))


def psi_categorical(ref: list, cur: list, *, eps: float = 1e-6) -> float:
    cats = set(ref) | set(cur)
    nr, nc = len(ref) or 1, len(cur) or 1
    rc = {c: 0 for c in cats}
    cc = {c: 0 for c in cats}
    for v in ref:
        rc[v] += 1
    for v in cur:
        cc[v] += 1
    total = 0.0
    for c in cats:
        r = rc[c] / nr
        k = cc[c] / nc
        total += (k - r) * math.log((k + eps) / (r + eps))
    return total


def ks_statistic(ref: list[float], cur: list[float]) -> float:
    pts = sorted(set(ref) | set(cur))
    nr, nc = len(ref) or 1, len(cur) or 1
    sref, scur = sorted(ref), sorted(cur)

    def cdf(sorted_data, x, n):
        return bisect.bisect_right(sorted_data, x) / n

    return max(abs(cdf(sref, x, nr) - cdf(scur, x, nc)) for x in pts)


def classify_psi(psi: float) -> str:
    if psi < 0.1:
        return "stable"
    if psi < 0.25:
        return "moderate"
    return "significant"
