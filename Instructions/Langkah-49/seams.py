"""
==========================================================================
 TITIK INTEGRASI (SEAM) — SAMBUNGKAN KE KODE PSD ASLI
==========================================================================
Worker Celery TIDAK boleh memakai sesi DB async per-request milik FastAPI.
Sediakan implementasi & engine/sesi khusus worker di seam ini.

Seam:
  1. synthesis_impl / room_data_impl / pipeline_impl  — logika job asli
     (Langkah 38/40/45). Antarmuka sudah diseragamkan: (job_id, payload) -> dict.
  2. set_job_status — persistensi status agar UI bisa POLLING (jangan andalkan
     result backend Celery untuk UX).
  3. Klasifikasi error: RetryableError vs PermanentError.
"""
from __future__ import annotations

import asyncio
import inspect


# --------------------------------------------------------------------------
# Klasifikasi error — menentukan apakah job di-retry.
# --------------------------------------------------------------------------
class RetryableError(Exception):
    """Galat sementara: jaringan, OpenAI 429/5xx, lock DB, timeout transien.
    → DI-RETRY dengan backoff."""


class PermanentError(Exception):
    """Galat permanen: validasi payload, kuota/token HABIS, data tak valid.
    → TIDAK di-retry (mencegah pemborosan token AI / loop sia-sia)."""


# --------------------------------------------------------------------------
# Jembatan async — bila impl PSD berupa coroutine (FastAPI), jalankan sinkron.
# --------------------------------------------------------------------------
def run_maybe_async(fn, *args, **kwargs):
    if inspect.iscoroutinefunction(fn):
        return asyncio.run(fn(*args, **kwargs))
    return fn(*args, **kwargs)


# --------------------------------------------------------------------------
# SEAM 1 — Implementasi job asli (GANTI isi fungsi-fungsi ini)
# --------------------------------------------------------------------------
def synthesis_impl(job_id: str, payload: dict) -> dict:
    """Mesin Data Sintesis (Langkah 38). Bungkus logika asli di sini.
    Angkat RetryableError utk galat transien, PermanentError utk kuota/validasi."""
    raise NotImplementedError("Sambungkan ke run_synthesis_job asli (Langkah 38).")


def room_data_impl(job_id: str, payload: dict) -> dict:
    """Job ruang data (Langkah 40)."""
    raise NotImplementedError("Sambungkan ke run_room_data_job asli (Langkah 40).")


def pipeline_impl(job_id: str, payload: dict) -> dict:
    """Eksekusi pipeline DuckDB (Langkah 45)."""
    raise NotImplementedError("Sambungkan ke run_pipeline_job asli (Langkah 45).")


# --------------------------------------------------------------------------
# SEAM 2 — Persistensi status job (GANTI isi fungsi ini)
# --------------------------------------------------------------------------
def set_job_status(job_id: str, status: str, **extra) -> None:
    """Tulis status job ke tabel/penyimpanan PSD agar UI bisa polling.

    status ∈ {queued, started, retrying, success, failure}.
    Contoh: simpan ke tabel jobs (status, attempt, error, updated_at).
    """
    raise NotImplementedError("Sambungkan set_job_status ke penyimpanan status PSD.")
