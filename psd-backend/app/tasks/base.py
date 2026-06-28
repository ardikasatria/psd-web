"""Base Task PSD: retry+backoff, penanda kegagalan final."""
from celery import Task

from app.tasks import seams


class PSDTask(Task):
    autoretry_for = (seams.RetryableError,)
    max_retries = 5
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True
    acks_late = True
    track_started = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        job_id = (args[0] if args else None) or kwargs.get("job_id")
        if job_id:
            seams.set_job_status(job_id, "failure", error=str(exc))
