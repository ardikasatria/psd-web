"""
Loader model dari registry MLflow (Langkah 56, sub-langkah 1).

Tipis & dapat diuji: `load_fn` diinject (nyata: mlflow.pyfunc.load_model).
Cache per (name, stage) agar tak memuat ulang tiap request.
"""
from __future__ import annotations


class ModelLoader:
    def __init__(self, load_fn, *, uri_fmt: str = "models:/{name}/{stage}"):
        self.load_fn = load_fn
        self.uri_fmt = uri_fmt
        self._cache: dict[tuple[str, str], object] = {}

    def uri(self, name: str, stage: str) -> str:
        return self.uri_fmt.format(name=name, stage=stage)

    def get(self, name: str, stage: str = "Production"):
        key = (name, stage)
        if key not in self._cache:
            self._cache[key] = self.load_fn(self.uri(name, stage))
        return self._cache[key]

    def invalidate(self, name: str, stage: str | None = None) -> None:
        """Hapus cache (mis. setelah promote versi baru di registry)."""
        if stage is None:
            for k in [k for k in self._cache if k[0] == name]:
                self._cache.pop(k, None)
        else:
            self._cache.pop((name, stage), None)
