"""Base Task PSD: retry+backoff, dan penanda kegagalan final ke seam status."""
from celery import Task

from . import seams


class PSDTask(Task):
    # Hanya RetryableError yang memicu retry otomatis.
    autoretry_for = (seams.RetryableError,)
    max_retries = 5
    retry_backoff = True          # 1s, 2s, 4s, ... eksponensial
    retry_backoff_max = 600       # cap 10 menit
    retry_jitter = True           # acak agar tak "thundering herd"
    acks_late = True
    track_started = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        # Dipanggil saat PermanentError ATAU retry sudah habis → tandai gagal.
        job_id = (args[0] if args else None) or kwargs.get("job_id")
        if job_id:
            seams.set_job_status(job_id, "failure", error=str(exc))
