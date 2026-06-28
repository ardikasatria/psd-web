"""Eksekutor per-node untuk task Airflow (Langkah 54)."""
from __future__ import annotations


def run_node(*, pipeline_id: str, node_id: str) -> None:
    """Jalankan satu node pipeline via engine PSD (DuckDB/Spark sesuai pemilih).

    Implementasi penuh: muat pipeline, tentukan engine, eksekusi node tunggal.
    Saat ini placeholder — pipeline ad-hoc tetap via Celery (Langkah 49).
    """
    raise NotImplementedError(
        f"run_node({pipeline_id!r}, {node_id!r}) — sambungkan ke eksekutor factory saat Airflow hidup."
    )
