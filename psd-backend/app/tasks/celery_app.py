"""Instance & konfigurasi Celery untuk PSD (Langkah 49)."""
from celery import Celery
from kombu import Queue

from app.core.config import settings


def _redis_base() -> str:
    url = settings.REDIS_URL.rstrip("/")
    if "/" in url.split("://", 1)[-1]:
        return url.rsplit("/", 1)[0]
    return url


BROKER_URL = settings.CELERY_BROKER_URL or f"{_redis_base()}/1"
RESULT_URL = settings.CELERY_RESULT_BACKEND or f"{_redis_base()}/2"

celery_app = Celery("psd", broker=BROKER_URL, backend=RESULT_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Jakarta",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    result_expires=60 * 60 * 24,
    broker_transport_options={"visibility_timeout": 60 * 60 * 6},
    task_default_queue="pabrik_data",
    task_queues=(
        Queue("ai"),
        Queue("pabrik_data"),
        Queue("spark"),
        Queue("email"),
    ),
    task_routes={
        "psd.synthesis.*": {"queue": "ai"},
        "psd.room_data.*": {"queue": "pabrik_data"},
        "psd.pipeline.run": {"queue": "pabrik_data"},
        "psd.pipeline.spark_run": {"queue": "spark"},
        "psd.mlops.drift_run": {"queue": "pabrik_data"},
        "psd.repos.purge_trash": {"queue": "pabrik_data"},
        "psd.email.*": {"queue": "email"},
    },
    beat_schedule={
        "email-daily-digest": {
            "task": "psd.email.daily_digest",
            "schedule": 60 * 60 * 24,
            "options": {"queue": "email"},
        },
        "repos-purge-trash": {
            "task": "psd.repos.purge_trash",
            "schedule": 60 * 60 * 24,
            "options": {"queue": "pabrik_data"},
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks", "app.email"])
