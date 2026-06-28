"""Klien REST MLflow (Langkah 55)."""
from __future__ import annotations

import httpx


class MlflowError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"MLflow API {status}: {body}")
        self.status = status
        self.body = body


class MlflowClient:
    def __init__(self, tracking_uri: str, *, transport=None, client=None):
        self._client = client or httpx.AsyncClient(
            base_url=tracking_uri.rstrip("/"),
            transport=transport,
            timeout=30.0,
        )

    async def aclose(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.aclose()

    async def _post(self, path: str, payload: dict) -> dict:
        r = await self._client.post(path, json=payload)
        if r.status_code >= 400:
            raise MlflowError(r.status_code, r.text)
        return r.json()

    async def create_registered_model(self, name: str, *, tags: dict | None = None) -> dict:
        body: dict = {"name": name}
        if tags:
            body["tags"] = [{"key": k, "value": str(v)} for k, v in tags.items()]
        try:
            return await self._post("/api/2.0/mlflow/registered-models/create", body)
        except MlflowError as e:
            if e.status == 409 or "RESOURCE_ALREADY_EXISTS" in e.body:
                return await self.get_registered_model(name)
            raise

    async def get_registered_model(self, name: str) -> dict:
        r = await self._client.get("/api/2.0/mlflow/registered-models/get", params={"name": name})
        if r.status_code >= 400:
            raise MlflowError(r.status_code, r.text)
        return r.json()

    async def create_run(self, experiment_id: str = "0", *, tags: dict | None = None) -> str:
        body: dict = {"experiment_id": experiment_id}
        if tags:
            body["tags"] = [{"key": k, "value": str(v)} for k, v in tags.items()]
        out = await self._post("/api/2.0/mlflow/runs/create", body)
        return out["run"]["info"]["run_id"]

    async def log_metrics(self, run_id: str, metrics: dict) -> None:
        for key, value in metrics.items():
            await self._post(
                "/api/2.0/mlflow/runs/log-metric",
                {"run_id": run_id, "key": key, "value": float(value), "timestamp": 0},
            )

    async def create_model_version(
        self,
        name: str,
        source: str,
        *,
        run_id: str | None = None,
        tags: dict | None = None,
    ) -> dict:
        body: dict = {"name": name, "source": source}
        if run_id:
            body["run_id"] = run_id
        if tags:
            body["tags"] = [{"key": k, "value": str(v)} for k, v in tags.items()]
        return await self._post("/api/2.0/mlflow/model-versions/create", body)
