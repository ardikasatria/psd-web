"""
Mesin rekomendasi (Langkah 57, sub-langkah 1).

- Pengguna aktif → skor afinitas (kategori/tag) × item.
- Pengguna cold (aktivitas minim) → fallback popularitas (cegah rekomendasi kosong).
- Cap per-kategori opsional untuk diversitas.

Berlaku untuk dataset/course/kompetisi/ruang (item generik: {id, categories, tags}).
"""
from __future__ import annotations

from .affinity import AffinityProfile


def score_item(item: dict, profile: AffinityProfile) -> float:
    s = 0.0
    for c in item.get("categories", []):
        s += profile.categories.get(c, 0.0)
    for t in item.get("tags", []):
        s += profile.tags.get(t, 0.0)
    return s


def _apply_category_cap(items: list[dict], cap: int) -> list[dict]:
    seen: dict[str, int] = {}
    out = []
    for it in items:
        cat = (it.get("categories") or ["_"])[0]
        if seen.get(cat, 0) >= cap:
            continue
        seen[cat] = seen.get(cat, 0) + 1
        out.append(it)
    return out


def recommend(profile: AffinityProfile, candidates: list[dict], *,
              exclude_ids=(), popularity: dict | None = None, k: int = 10,
              cold_min: int = 5, per_category_cap: int | None = None) -> dict:
    popularity = popularity or {}
    excl = set(exclude_ids)
    pool = [c for c in candidates if c["id"] not in excl]

    if profile.is_cold(cold_min):
        ranked = sorted(pool, key=lambda c: popularity.get(c["id"], 0), reverse=True)
        strategy = "popularity"
    else:
        scored = [(score_item(c, profile), popularity.get(c["id"], 0), c) for c in pool]
        scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
        ranked = [c for _, _, c in scored]
        strategy = "affinity"

    if per_category_cap:
        ranked = _apply_category_cap(ranked, per_category_cap)
    return {"items": ranked[:k], "strategy": strategy}
