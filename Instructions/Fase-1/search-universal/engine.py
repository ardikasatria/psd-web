"""
Mesin pencarian universal: menjalankan banyak SUMBER (akun, proyek, model, dataset,
kompetisi, event, tim, forum, notebook, org), menggabungkan & memeringkat hasil
lintas tipe, lalu mengelompokkan per kategori (untuk dropdown header & halaman hasil).

Tiap sumber mengimplementasikan:
    kind: str
    search(text: str, filters: dict, limit: int) -> list[dict]   # hit ternormalisasi
hit ternormalisasi: {id, title, subtitle?, url, popularity?, kind?}
"""
from __future__ import annotations

from .query import normalize_kind, parse_query
from .relevance import score_hit

# Bobot tipe (sedikit menonjolkan akun & kompetisi di hasil campuran).
KIND_WEIGHTS = {
    "user": 1.05, "competition": 1.1, "project": 1.0, "model": 1.0,
    "dataset": 1.0, "event": 1.0, "team": 0.9, "org": 0.95,
    "forum": 0.85, "notebook": 0.85, "post": 0.8,
}


def group_by_kind(hits: list[dict], per_category: int) -> dict:
    grouped: dict[str, list[dict]] = {}
    for h in hits:                                  # asumsi hits sudah terurut skor
        k = h["kind"]
        bucket = grouped.setdefault(k, [])
        if len(bucket) < per_category:
            bucket.append(h)
    return grouped


class SearchEngine:
    def __init__(self, sources: list):
        self.sources = sources

    def search(self, raw: str, *, limit: int = 20, per_category: int = 5,
               source_limit: int = 20) -> dict:
        parsed = parse_query(raw)
        text = parsed["text"]
        type_filter = parsed["filters"].get("type")

        hits: list[dict] = []
        for src in self.sources:
            if type_filter and normalize_kind(type_filter) != src.kind:
                continue
            for h in src.search(text, parsed["filters"], source_limit) or []:
                h = {**h, "kind": src.kind}
                s = score_hit(text, h, weight=KIND_WEIGHTS.get(src.kind, 1.0))
                if s > 0 or not text:               # query kosong → mode jelajah
                    hits.append({**h, "score": s})

        hits.sort(key=lambda h: (-h["score"], h.get("title", "").lower()))
        return {
            "query": parsed,
            "total": len(hits),
            "results": hits[:limit],
            "grouped": group_by_kind(hits, per_category),
        }
