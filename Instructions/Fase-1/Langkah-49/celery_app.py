"""
Instance & konfigurasi Celery untuk PSD (Langkah 49).

Dua antrian terpisah agar beban AI (latensi OpenAI, ter-throttle token) tidak
menyumbat Pabrik Data, dan sebaliknya:
  - "ai"          : job sintesis (Langkah 38) & AI lain (mis. AI Asisten nanti).
  - "pabrik_data" : job ruang data (40) & pipeline DuckDB (45).

Broker & result via Redis (sudah ada di PSD). Pakai DB Redis terpisah untuk
broker vs result agar tidak saling tabrak.
"""
import os

from celery import Celery
from kombu import Queue

BROKER_URL = os.environ.get("PSD_CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_URL = os.environ.get("PSD_CELERY_RESULT_URL", "redis://localhost:6379/1")

celery_app = Celery("psd", broker=BROKER_URL, backend=RESULT_URL)

celery_app.conf.update(
    # --- serialisasi aman (JSON saja; JANGAN pickle) ---
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Jakarta",
    enable_utc=True,

    # --- keandalan untuk job PANJANG (DuckDB/AI) ---
    task_acks_late=True,                 # ack setelah selesai, bukan saat diterima
    task_reject_on_worker_lost=True,     # worker mati → job dikembalikan ke antrian
    worker_prefetch_multiplier=1,        # adil; jangan borong banyak job panjang
    task_track_started=True,             # status STARTED terlihat
    result_expires=60 * 60 * 24,         # hasil kedaluwarsa 1 hari (jaga memori Redis)
    broker_transport_options={"visibility_timeout": 60 * 60 * 6},  # 6 jam

    # --- antrian & routing ---
    task_default_queue="pabrik_data",
    task_queues=(
        Queue("ai"),
        Queue("pabrik_data"),
    ),
    task_routes={
        "psd.synthesis.*": {"queue": "ai"},
        "psd.room_data.*": {"queue": "pabrik_data"},
        "psd.pipeline.*": {"queue": "pabrik_data"},
    },
)

# Pastikan modul task ter-import oleh worker.
celery_app.autodiscover_tasks(["app.tasks"])
