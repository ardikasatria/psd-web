"""
==========================================================================
 TITIK INTEGRASI (SEAM) — Ruang Panen Data
==========================================================================
Eksekusi HTTP (dengan cek SSRF saat resolusi DNS), rahasia auth (vault),
penulisan hasil ke aset DATASET (buat/versi) via modul dataset + MinIO.
Job berjalan async (Celery), dibatasi tier/kuota (gamifikasi).
"""
from __future__ import annotations


def get_allowlist() -> list[str] | None:
    """Domain yang boleh dipanen (None = izinkan semua non-internal, tetap cek SSRF)."""
    raise NotImplementedError


def fetch(url: str, *, method: str, params: dict, headers: dict, timeout: float) -> dict:
    """HTTP fetch AMAN: cek SSRF pada IP hasil resolusi, hormati timeout & ukuran maks."""
    raise NotImplementedError


def load_auth_headers(job_id: str) -> dict:
    """Ambil rahasia auth (api_key/bearer/basic) dari vault → header. Jangan simpan plaintext."""
    raise NotImplementedError


def write_to_dataset(target: dict, rows: list[dict], *, fmt: str, filename: str) -> dict:
    """
    Salurkan hasil panen ke aset DATASET user (BUKAN disimpan sendiri):
    - mode 'new'     → buat Dataset baru milik owner, unggah berkas (MinIO), commit versi awal.
    - mode 'version' → tambah berkas sebagai versi baru dataset yang ada.
    Kembalikan {dataset_slug, version, file_key, rows}.
    """
    raise NotImplementedError


def check_quota(user_id: str) -> None:
    """Batasi jumlah/frekuensi panen per tier (gamifikasi). 429 bila lewat."""
    raise NotImplementedError
