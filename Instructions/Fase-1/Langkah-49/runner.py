"""Runner bersama untuk ketiga job — transisi status + logging terstruktur."""
import logging

from . import seams

log = logging.getLogger("psd.tasks")


def execute(task, kind: str, job_id: str, payload: dict, impl) -> dict:
    """Jalankan satu job dengan transisi status seragam.

    - started  : sebelum kerja (sertakan nomor percobaan)
    - retrying : saat RetryableError → base task me-retry dengan backoff
    - success  : selesai
    - failure  : ditangani PSDTask.on_failure (permanen / retry habis)
    """
    attempt = task.request.retries + 1
    seams.set_job_status(job_id, "started", attempt=attempt)
    log.info("job-start", extra={"kind": kind, "job_id": job_id, "attempt": attempt})

    try:
        result = seams.run_maybe_async(impl, job_id, payload)
    except seams.RetryableError as e:
        seams.set_job_status(job_id, "retrying", error=str(e), attempt=attempt)
        log.warning("job-retry", extra={"kind": kind, "job_id": job_id, "error": str(e)})
        raise  # autoretry_for menangkap → retry
    # PermanentError & galat lain dibiarkan naik → PSDTask.on_failure.

    seams.set_job_status(job_id, "success")
    log.info("job-done", extra={"kind": kind, "job_id": job_id})
    return result
