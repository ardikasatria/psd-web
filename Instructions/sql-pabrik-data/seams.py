"""
==========================================================================
 TITIK INTEGRASI (SEAM) — Pabrik Data (Ruang Analitik)
==========================================================================
Registrasi output upstream sebagai view DuckDB, eksekusi SQL hasil kompilasi,
materialisasi ke MinIO (medallion), & sumber dari aset dataset/notebook.
"""
from __future__ import annotations


def register_source_relations(con, nodes) -> None:
    """
    Daftarkan setiap source sebagai VIEW DuckDB dari parquet MinIO yang DIKONTROL platform.
    Sumber = aset dataset (termasuk output notebook yang sudah dimaterialisasi jadi dataset).
    Jangan biarkan user menaruh path file sembarang (SSRF/baca file lokal).
    """
    raise NotImplementedError


def run_sql(con, sql: str, *, timeout_s: int):
    """Jalankan SQL hasil kompilasi pada koneksi DuckDB yang SUDAH di-hardening + timeout."""
    raise NotImplementedError


def materialize(con, node_id: str, layer: str) -> dict:
    """Tulis hasil node ke MinIO sebagai parquet lapisan medallion; kembalikan referensi."""
    raise NotImplementedError


def dataset_relation_for(asset_ref: str) -> str:
    """Resolusi aset dataset/notebook-output → nama relasi terdaftar (identifier aman)."""
    raise NotImplementedError


def check_quota(user_id: str, tier: str) -> None:
    """Batasi ukuran/frekuensi eksekusi pipeline per tier (gamifikasi). 429 bila lewat."""
    raise NotImplementedError
