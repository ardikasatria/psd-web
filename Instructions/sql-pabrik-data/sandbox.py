"""
Sandbox eksekusi DuckDB + gating node SQL mentah per tier + lapisan medallion.
"""
from __future__ import annotations

# Lapisan medallion untuk materialisasi hasil node ke MinIO.
MEDALLION = ("bronze", "silver", "gold")


def duckdb_hardening(*, memory_limit: str = "512MB", threads: int = 2) -> list[str]:
    """
    Pengaturan untuk mengunci koneksi DuckDB SEBELUM menjalankan SQL user.
    Urutan penting: batasi sumber daya & matikan akses eksternal, lalu kunci konfigurasi.
    """
    return [
        f"SET memory_limit='{memory_limit}'",
        f"SET threads={threads}",
        "SET enable_external_access=false",   # blokir baca file/http/s3 sembarang
        "SET lock_configuration=true",        # cegah SET lanjutan (mis. menyalakan lagi)
    ]


def raw_sql_allowed(tier: str) -> bool:
    """Node SQL mentah hanya untuk tier menengah/lanjut (konsumsi sumber daya lebih)."""
    return (tier or "").lower() in ("menengah", "lanjut")


def target_layer(node_role: str) -> str:
    """Petakan peran node ke lapisan medallion (source→bronze, transform→silver, sink→gold)."""
    return {"source": "bronze", "transform": "silver", "sink": "gold"}.get(node_role, "silver")
