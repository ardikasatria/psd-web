"""
==========================================================================
 TITIK INTEGRASI (SEAM) — sumber data & sink monitoring
==========================================================================
"""
from __future__ import annotations


def load_reference(model_name: str, model_version: str, feature: str) -> list:
    """Distribusi acuan (training/baseline) untuk satu fitur."""
    raise NotImplementedError("Muat data acuan dari penyimpanan PSD.")


def load_current(model_name: str, model_version: str, feature: str) -> list:
    """Distribusi terkini (produksi/inferensi terbaru) untuk satu fitur."""
    raise NotImplementedError("Muat data terkini dari penyimpanan PSD.")


def write_monitoring_rows(rows: list[dict]) -> None:
    """Tulis baris ke tabel gold monitoring (Langkah 46/Pabrik Data)."""
    raise NotImplementedError("Tulis ke tabel gold monitoring PSD.")


def raise_alert(alert: dict) -> None:
    """(Opsional) kirim notifikasi (Langkah 29) untuk drift signifikan."""
    raise NotImplementedError("Sambungkan ke notifikasi PSD bila diinginkan.")
