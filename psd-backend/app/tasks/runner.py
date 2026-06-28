"""Runner bersama — transisi status + logging terstruktur."""
import logging

from app.tasks import seams

log = logging.getLogger("psd.tasks")


def execute(task, kind: str, job_id: str, payload: dict, impl) -> dict:
    attempt = task.request.retries + 1
    seams.set_job_status(job_id, "started", attempt=attempt)
    log.info("job-start", extra={"kind": kind, "job_id": job_id, "attempt": attempt})

    try:
        result = seams.run_maybe_async(impl, job_id, payload)
    except seams.RetryableError as e:
        seams.set_job_status(job_id, "retrying", error=str(e), attempt=attempt)
        log.warning("job-retry", extra={"kind": kind, "job_id": job_id, "error": str(e)})
        raise

    seams.set_job_status(job_id, "success")
    log.info("job-done", extra={"kind": kind, "job_id": job_id})
    return result
