"""
Service registry model (Langkah 55, sub-langkah 1).

Tipis di atas MlflowClient (diinject agar dapat diuji). Mendaftarkan model dari
run ruang/kompetisi + versi + transisi stage.

Pemakaian nyata:
    from mlflow.tracking import MlflowClient
    svc = RegistryService(MlflowClient(tracking_uri=...))
"""
from __future__ import annotations


class RegistryService:
    def __init__(self, client):
        self.client = client

    def ensure_registered_model(self, name: str) -> None:
        """Buat registered model bila belum ada (idempoten)."""
        try:
            self.client.create_registered_model(name)
        except Exception:
            # sudah ada → abaikan
            pass

    def register_from_run(self, *, name: str, run_id: str, artifact_path: str = "model",
                          tags: dict | None = None) -> str:
        """Daftarkan versi baru dari artefak sebuah run. Kembalikan nomor versi."""
        self.ensure_registered_model(name)
        source = f"runs:/{run_id}/{artifact_path}"
        mv = self.client.create_model_version(name=name, source=source, run_id=run_id)
        version = getattr(mv, "version", None) or mv["version"]
        if tags:
            for k, v in tags.items():
                self.client.set_model_version_tag(name, version, k, v)
        return str(version)

    def promote(self, *, name: str, version: str, stage: str = "Production",
                archive_existing: bool = True) -> None:
        """Transisikan versi ke stage (Staging/Production/Archived)."""
        self.client.transition_model_version_stage(
            name=name, version=version, stage=stage,
            archive_existing_versions=archive_existing,
        )
