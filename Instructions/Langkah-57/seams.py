"""
==========================================================================
 TITIK INTEGRASI (SEAM) — asisten & rekomendasi
==========================================================================
"""
from __future__ import annotations


def activity_summary(user_id: str) -> dict:
    """Ringkasan aktivitas (Langkah 35): {categories:{}, tags:{}, event_count}."""
    raise NotImplementedError("Ambil activity-summary dari Langkah 35.")


def candidate_items(kind: str) -> list[dict]:
    """Kandidat item per jenis: [{id, categories, tags, ...}]."""
    raise NotImplementedError("Kembalikan kandidat dataset/course/kompetisi/ruang.")


def popularity(kind: str) -> dict:
    """{item_id: skor_popularitas} untuk fallback cold-start."""
    raise NotImplementedError("Kembalikan popularitas per jenis.")


def user_state(user_id: str) -> dict:
    """Status untuk 'langkah berikutnya' (progres, publikasi, poin)."""
    raise NotImplementedError("Kembalikan status pengguna PSD.")


def user_id(user) -> str:
    raise NotImplementedError("Kembalikan id pengguna PSD.")


def user_tier(user) -> str:
    raise NotImplementedError("Kembalikan tier pengguna (untuk kuota AI).")


def llm_complete(messages: list[dict]) -> str:
    """Panggil OpenAI dengan messages → balasan teks."""
    raise NotImplementedError("Sambungkan ke OpenAI.")
