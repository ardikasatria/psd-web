"""
==========================================================================
 TITIK INTEGRASI (SEAM) — serving
==========================================================================
"""
from __future__ import annotations


def load_model(uri: str):
    """Muat model dari URI registry. Nyata: mlflow.pyfunc.load_model(uri)."""
    raise NotImplementedError("Sambungkan ke mlflow.pyfunc.load_model.")


def user_id(user) -> str:
    raise NotImplementedError("Kembalikan id pengguna PSD.")


def user_tier(user) -> str:
    """Tier gamifikasi pengguna (untuk kuota). Konsisten dgn Langkah 52."""
    raise NotImplementedError("Kembalikan tier pengguna PSD.")


def write_monitoring_rows(rows: list[dict]) -> None:
    """Tulis baris pemantauan ke tabel gold (sama dgn Langkah 55)."""
    raise NotImplementedError("Tulis ke tabel gold monitoring PSD.")


def trigger_retrain(model_name: str, reason: str) -> None:
    """Picu pipeline retraining (mis. enqueue job)."""
    raise NotImplementedError("Sambungkan ke pipeline retraining PSD.")
