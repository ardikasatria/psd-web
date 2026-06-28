"""
Katalog peristiwa yang bisa mengirim email (Fase 0 & Fase 1).

mode default: 'immediate' (kirim segera), 'digest' (kumpulkan harian), 'off'.
Pengguna dapat menimpa per-peristiwa di preferensi.
"""
from __future__ import annotations

EVENTS: dict[str, dict] = {
    # ---------- Fase 0 ----------
    "welcome":               {"phase": 0, "mode": "immediate", "desc": "Selamat datang / verifikasi email."},
    "course_published":      {"phase": 0, "mode": "immediate", "desc": "Course Anda dipublikasikan (alur dua-pihak)."},
    "course_enrolled":       {"phase": 0, "mode": "immediate", "desc": "Konfirmasi pendaftaran course."},
    "quiz_graded":           {"phase": 0, "mode": "immediate", "desc": "Kuis Anda telah dinilai."},
    "competition_result":    {"phase": 0, "mode": "immediate", "desc": "Hasil/peringkat kompetisi."},
    "dataset_published":     {"phase": 0, "mode": "immediate", "desc": "Dataset Anda dipublikasikan."},
    "marketplace_match":     {"phase": 0, "mode": "immediate", "desc": "Kecocokan talenta ↔ UMKM."},
    "notification_generic":  {"phase": 0, "mode": "digest",    "desc": "Notifikasi umum (Langkah 29)."},
    # ---------- Fase 1 ----------
    "pr_opened":             {"phase": 1, "mode": "immediate", "desc": "Pull request baru di repo Anda (51)."},
    "pr_reviewed":           {"phase": 1, "mode": "immediate", "desc": "PR Anda direview (51)."},
    "pr_merged":             {"phase": 1, "mode": "immediate", "desc": "PR Anda di-merge (51)."},
    "pr_commented":          {"phase": 1, "mode": "digest",    "desc": "Komentar pada PR (51)."},
    "drift_alert":           {"phase": 1, "mode": "immediate", "desc": "Drift model signifikan (55)."},
    "model_promoted":        {"phase": 1, "mode": "immediate", "desc": "Versi model dipromosikan (55)."},
    "quota_warning":         {"phase": 1, "mode": "immediate", "desc": "Kuota AI/inferensi hampir habis (56/57)."},
}

DEFAULT_MODE = "immediate"


def event_mode(event_type: str) -> str:
    return EVENTS.get(event_type, {}).get("mode", DEFAULT_MODE)
