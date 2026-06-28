"""
Autoscaling & trigger retraining (Langkah 56, sub-langkah 2 & 3).

- desired_replicas: kebijakan murni (RPS → jumlah replika), untuk dipakai HPA/
  autoscaler eksternal. CPU-only (sesuai strategi).
- should_retrain: aturan trigger retraining dari status drift berjendela
  (memakai output Langkah 55).
"""
from __future__ import annotations

import math


def desired_replicas(*, rps: float, target_rps_per_replica: float,
                     min_replicas: int = 1, max_replicas: int = 10) -> int:
    if target_rps_per_replica <= 0:
        raise ValueError("target_rps_per_replica harus > 0.")
    need = math.ceil(rps / target_rps_per_replica) if rps > 0 else min_replicas
    return max(min_replicas, min(max_replicas, need))


def should_retrain(drift_window_statuses: list[str], *, consecutive: int = 3) -> bool:
    """True bila drift 'significant' berturut-turut >= `consecutive` jendela.

    statuses: urut lama→baru, nilai 'stable'/'moderate'/'significant' (Langkah 55).
    """
    run = 0
    for s in drift_window_statuses:
        run = run + 1 if s == "significant" else 0
        if run >= consecutive:
            return True
    return False
