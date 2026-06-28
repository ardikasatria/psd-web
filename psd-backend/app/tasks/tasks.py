"""Tiga task Celery — port dari BackgroundTasks (Langkah 38/40/45)."""
from app.tasks.base import PSDTask
from app.tasks.celery_app import celery_app
from app.tasks import seams
from app.tasks.runner import execute


@celery_app.task(bind=True, base=PSDTask, name="psd.synthesis.run")
def run_synthesis_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "synthesis", job_id, payload, seams.synthesis_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.room_data.run")
def run_room_data_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "room_data", job_id, payload, seams.room_data_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.pipeline.run")
def run_pipeline_job(self, job_id: str, payload: dict) -> dict:
    return execute(self, "pipeline", job_id, payload, seams.pipeline_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.pipeline.spark_run")
def run_spark_pipeline_job(self, job_id: str, payload: dict) -> dict:
    payload = {**payload, "engine": "spark"}
    return execute(self, "pipeline_spark", job_id, payload, seams.pipeline_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.mlops.drift_run")
def run_drift_job(self, report_id: str, payload: dict) -> dict:
    return execute(self, "drift", report_id, payload, seams.drift_impl)


@celery_app.task(bind=True, base=PSDTask, name="psd.serving.retrain")
def run_retrain_job(self, model_name: str, reason: str) -> dict:
    """Stub retraining — log & kembalikan status (pipeline penuh menyusul)."""
    import logging

    logging.getLogger(__name__).info("retrain_job model=%s reason=%s", model_name, reason)
    return {"status": "queued", "model": model_name, "reason": reason}
