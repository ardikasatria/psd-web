"""
Spesifikasi Spark job TERISOLASI untuk menjalankan skrip pipeline (termasuk node kode
.py mentah). Keamanan kode arbitrer = ISOLASI (kontainer/pod), bukan guard statis.

Prinsip:
- Node kode .py mentah butuh tier tinggi + grant akses kernel (Langkah 26).
- Eksekutor terisolasi: tanpa mount host, egress terkunci (hanya cluster + MinIO),
  batas cpu/mem/waktu, identitas = user (OIDC), output ke aset dataset.
"""
from __future__ import annotations


def raw_code_allowed(tier: str) -> bool:
    """Kode .py mentah lebih berisiko dari SQL → hanya tier 'lanjut'."""
    return (tier or "").lower() == "lanjut"


def build_job_spec(*, script_key: str, user: str, tier: str,
                   executors: int = 2, executor_memory: str = "2g",
                   executor_cores: int = 1, timeout_s: int = 900,
                   has_raw_code: bool = False) -> dict:
    """
    Rakit spesifikasi submit Spark job terisolasi. Field ops (image, namespace, dll.)
    dilengkapi seam. `requires_grant` menandai butuh grant akses kernel (Langkah 26).
    """
    return {
        "script_key": script_key,          # skrip di MinIO (hasil kompiler)
        "run_as": user,                    # identitas OIDC user
        "requires_grant": bool(has_raw_code),   # kode mentah → wajib grant Langkah 26
        "resources": {
            "executors": executors,
            "executor_memory": executor_memory,
            "executor_cores": executor_cores,
        },
        "isolation": {
            "network_egress": "restricted",   # hanya cluster Spark + MinIO
            "host_mounts": False,             # tanpa akses filesystem host
            "read_only_root": True,
        },
        "timeout_s": timeout_s,
        "output": "dataset",               # hasil disalurkan ke aset dataset (gold)
    }
