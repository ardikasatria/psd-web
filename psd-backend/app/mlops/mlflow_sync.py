"""Klien MLflow sinkron untuk RegistryService (Langkah 55)."""
from __future__ import annotations

from types import SimpleNamespace

import httpx

from app.core.config import settings


class MlflowSyncClient:
    """Antarmuka sync yang diharapkan RegistryService."""

    def __init__(self, tracking_uri: str | None = None, *, client: httpx.Client | None = None):
        self._client = client or httpx.Client(
            base_url=(tracking_uri or settings.PSD_MLFLOW_TRACKING_URI).rstrip("/"),
            timeout=30.0,
        )

    def close(self):
        self._client.close()

    def _post(self, path: str, payload: dict) -> dict:
        r = self._client.post(path, json=payload)
        if r.status_code >= 400:
            raise RuntimeError(f"MLflow API {r.status_code}: {r.text}")
        return r.json()

    def create_registered_model(self, name: str) -> None:
        self._post("/api/2.0/mlflow/registered-models/create", {"name": name})

    def create_model_version(self, name: str, source: str, run_id: str):
        out = self._post(
            "/api/2.0/mlflow/model-versions/create",
            {"name": name, "source": source, "run_id": run_id},
        )
        version = out.get("model_version", {}).get("version", "1")
        return SimpleNamespace(version=str(version))

    def set_model_version_tag(self, name: str, version: str, k: str, v: str) -> None:
        self._post(
            "/api/2.0/mlflow/model-versions/set-tag",
            {"name": name, "version": version, "key": k, "value": str(v)},
        )

    def transition_model_version_stage(
        self,
        name: str,
        version: str,
        stage: str,
        archive_existing_versions: bool = True,
    ) -> None:
        self._post(
            "/api/2.0/mlflow/model-versions/transition-stage",
            {
                "name": name,
                "version": version,
                "stage": stage,
                "archive_existing_versions": archive_existing_versions,
            },
        )

    def create_run(self, *, tags: dict | None = None) -> str:
        body: dict = {"experiment_id": "0"}
        if tags:
            body["tags"] = [{"key": k, "value": str(v)} for k, v in tags.items()]
        out = self._post("/api/2.0/mlflow/runs/create", body)
        return out["run"]["info"]["run_id"]

    def log_metrics(self, run_id: str, metrics: dict) -> None:
        for key, value in metrics.items():
            self._post(
                "/api/2.0/mlflow/runs/log-metric",
                {"run_id": run_id, "key": key, "value": float(value), "timestamp": 0},
            )
