"""
==========================================================================
 TITIK INTEGRASI (SEAM) — gamifikasi Pabrik Data
==========================================================================
Sambung ke gamifikasi pusat (Langkah 25): tier user, pencatatan poin, counter
event quest, dan klaim reward. Batas engine dipakai router Pabrik Data (Langkah 38/39).
"""
from __future__ import annotations


def user_tier(user_id: str) -> str:
    raise NotImplementedError("Ambil tier dari gamifikasi pusat.")


def record_points(user_id: str, event: str, points: int) -> None:
    raise NotImplementedError("Catat poin ke engine gamifikasi pusat.")


def runs_today(user_id: str, engine: str) -> int:
    raise NotImplementedError("Hitung run engine hari ini (untuk kuota).")


def quest_counters(user_id: str) -> dict:
    raise NotImplementedError("Ambil counter event quest pengguna.")


def claimed_quest_ids(user_id: str) -> list[str]:
    raise NotImplementedError


def claim_reward(user_id: str, quest_id: str, points: int) -> None:
    raise NotImplementedError("Tandai quest diklaim + tambahкан poin reward.")
