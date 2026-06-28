"""
Pengganti `BackgroundTasks.add_task(...)` di endpoint FastAPI.

Pola lama:
    background_tasks.add_task(run_synthesis_job, job_id, payload)

Pola baru (kembalikan task_id untuk polling status):
    task_id = enqueue_synthesis(job_id, payload)

Endpoint cukup: buat job_id, panggil enqueue_*, balas {job_id, task_id}.
UI polling GET /jobs/{job_id} membaca status dari seam set_job_status.
"""
from . import seams
from .tasks import run_pipeline_job, run_room_data_job, run_synthesis_job


def enqueue_synthesis(job_id: str, payload: dict) -> str:
    seams.set_job_status(job_id, "queued")
    return run_synthesis_job.apply_async(args=[job_id, payload]).id


def enqueue_room_data(job_id: str, payload: dict) -> str:
    seams.set_job_status(job_id, "queued")
    return run_room_data_job.apply_async(args=[job_id, payload]).id


def enqueue_pipeline(job_id: str, payload: dict) -> str:
    seams.set_job_status(job_id, "queued")
    return run_pipeline_job.apply_async(args=[job_id, payload]).id
