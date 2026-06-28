"""
Tiga task Celery — port dari job BackgroundTasks (Langkah 38/40/45).

Nama task menentukan routing antrian (lihat celery_app.py):
  psd.synthesis.run  -> antrian "ai"
  psd.room_data.run  -> antrian "pabrik_data"
  psd.pipeline.run   -> antrian "pabrik_data"
"""
from . import seams
from .base import PSDTask
from .celery_app import celery_app
from .runner import execute


@celery_app.task(bind=True, base=PSDTask, name="psd.synthesis.run")
def run_synthesis_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "synthesis", job_id, payload, seams.synthesis_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.room_data.run")
def run_room_data_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "room_data", job_id, payload, seams.room_data_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.pipeline.run")
def run_pipeline_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "pipeline", job_id, payload, seams.pipeline_impl)
