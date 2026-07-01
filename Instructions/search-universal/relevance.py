"""
Skoring relevansi hasil pencarian.

text_score : exact(1.0) > prefix(0.8) > substring(0.6) > token-overlap(≤0.4).
score_hit  : skor akhir = relevansi × bobot_tipe + boost_popularitas (hanya bila cocok).
             Query kosong → mode jelajah (urut popularitas).
"""
from __future__ import annotations


def text_score(query: str, text: str) -> float:
    q = (query or "").lower().strip()
    t = (text or "").lower().strip()
    if not q or not t:
        return 0.0
    if t == q:
        return 1.0
    if t.startswith(q):
        return 0.8
    if q in t:
        return 0.6
    qt, tt = set(q.split()), set(t.split())
    if not qt:
        return 0.0
    return 0.4 * (len(qt & tt) / len(qt))


def score_hit(query_text: str, hit: dict, *, weight: float = 1.0) -> float:
    q = (query_text or "").strip()
    popularity = hit.get("popularity", 0) or 0
    if not q:
        # mode jelajah: urut popularitas
        return round(min(1.0, popularity / 10000.0) * weight, 6)
    base = max(text_score(q, hit.get("title", "")),
               text_score(q, hit.get("subtitle", "")) * 0.3)
    if base == 0.0:
        return 0.0
    pop_boost = min(0.2, popularity / 10000.0)
    return round(base * weight + pop_boost, 6)
