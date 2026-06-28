"""Service inferensi terkelola (Langkah 56)."""
from __future__ import annotations

import time


def _n_inputs(payload) -> int:
    try:
        return len(payload)
    except TypeError:
        return 1


class InferenceService:
    def __init__(self, loader, *, log_fn=None, clock=time.perf_counter):
        self.loader = loader
        self.log_fn = log_fn or (lambda **kw: None)
        self.clock = clock

    def predict(self, name: str, payload, *, stage: str = "Production") -> dict:
        model = self.loader.get(name, stage)
        t0 = self.clock()
        output = model.predict(payload)
        latency_ms = (self.clock() - t0) * 1000.0
        self.log_fn(model_name=name, stage=stage, latency_ms=latency_ms, n=_n_inputs(payload))
        return {"prediction": _serialize_prediction(output), "latency_ms": round(latency_ms, 3)}


def _serialize_prediction(output):
    """Konversi output numpy/pandas ke JSON-serializable."""
    if hasattr(output, "tolist"):
        return output.tolist()
    if isinstance(output, list):
        return output
    return output
