"""
Perolehan poin per aktivitas (mesin gamifikasi PSD).

Memetakan peristiwa (dari pelacakan aktivitas Langkah 35) → poin. Total poin
menentukan tier (tiers.tier_for_points). Penyimpanan poin per pengguna = seam
(mungkin sudah ada di Fase 0); modul ini mendefinisikan ATURAN perolehan.
"""
from __future__ import annotations

# Poin per peristiwa. Sesuaikan dengan desain gamifikasi PSD.
POINTS: dict[str, int] = {
    "daily_login": 5,
    "course_completed": 100,
    "quiz_passed": 20,
    "dataset_published": 50,
    "competition_submitted": 30,
    "competition_top3": 200,
    "pr_merged": 40,
    "notebook_shared": 25,
    "helpful_review": 15,
}


def award(event_type: str) -> int:
    """Poin untuk satu peristiwa (0 bila tak dikenal)."""
    return POINTS.get(event_type, 0)


def total_points(event_counts: dict[str, int]) -> int:
    """Total poin dari hitungan peristiwa: {'course_completed': 2, ...}."""
    return sum(award(et) * n for et, n in event_counts.items())
