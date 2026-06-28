"""
Seam integrasi MLops (Langkah 55).

Fungsi load_reference/load_current/write_monitoring_rows/raise_alert sesuai scaffold.
Helper PSD untuk auth, URI, dan konteks job drift.
"""
from __future__ import annotations

import os
import tempfile
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.mlops.models import ModelRegistry
from app.mlops.monitoring import GOLD_TABLE
from app.modules.competitions.models import Submission
from app.modules.repos.models import Repo
from app.modules.teams.deps import membership
from app.modules.users.models import User

_drift_ctx: dict[str, Any] = {}


# --- scaffold seams ---


def load_reference(model_name: str, model_version: str, feature: str) -> list:
    cols = _drift_ctx.get("ref_cols") or {}
    if feature not in cols:
        raise ValueError(f"Fitur acuan '{feature}' tidak ditemukan")
    return cols[feature][0]


def load_current(model_name: str, model_version: str, feature: str) -> list:
    cols = _drift_ctx.get("cur_cols") or {}
    if feature not in cols:
        raise ValueError(f"Fitur terkini '{feature}' tidak ditemukan")
    return cols[feature][0]


def write_monitoring_rows(rows: list[dict]) -> None:
    uri = _drift_ctx.get("gold_uri")
    if not uri:
        raise RuntimeError("gold_uri belum di-bind untuk job drift")
    new_df = pd.DataFrame(rows)
    if settings.STORAGE_ENABLED and uri.startswith("s3://"):
        import boto3

        bucket_key = uri.replace(f"s3://{settings.S3_ASSETS_BUCKET}/", "")
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        combined = new_df
        try:
            with tempfile.NamedTemporaryFile(suffix=".parquet", delete=False) as tmp:
                tmp_path = tmp.name
            s3.download_file(settings.S3_ASSETS_BUCKET, bucket_key, tmp_path)
            combined = pd.concat([pd.read_parquet(tmp_path), new_df], ignore_index=True)
            os.unlink(tmp_path)
        except Exception:
            pass
        with tempfile.NamedTemporaryFile(suffix=".parquet", delete=False) as tmp:
            combined.to_parquet(tmp.name, index=False)
            s3.upload_file(tmp.name, settings.S3_ASSETS_BUCKET, bucket_key)
            os.unlink(tmp.name)
        return

    out_dir = os.path.join(tempfile.gettempdir(), "psd-mlops")
    os.makedirs(out_dir, exist_ok=True)
    path = uri if not uri.startswith("s3://") else os.path.join(out_dir, GOLD_TABLE + ".parquet")
    if os.path.exists(path):
        combined = pd.concat([pd.read_parquet(path), new_df], ignore_index=True)
    else:
        combined = new_df
    combined.to_parquet(path, index=False)


def raise_alert(alert: dict) -> None:
    """Opsional — notifikasi drift signifikan (Langkah 29 menyusul)."""
    _drift_ctx.setdefault("alerts", []).append(alert)


# --- PSD helpers ---


def bind_drift_context(
    *,
    model_name: str,
    model_version: str,
    ref_cols: dict[str, tuple[list, str]],
    cur_cols: dict[str, tuple[list, str]],
    gold_uri: str,
) -> None:
    _drift_ctx.clear()
    _drift_ctx.update(
        {
            "model_name": model_name,
            "model_version": model_version,
            "ref_cols": ref_cols,
            "cur_cols": cur_cols,
            "gold_uri": gold_uri,
            "alerts": [],
        }
    )


def pop_drift_alerts() -> list[dict]:
    return list(_drift_ctx.get("alerts") or [])


def mlflow_model_name(owner_username: str, slug: str) -> str:
    safe = slug.replace("/", "_").replace(" ", "-").lower()
    return f"psd_{owner_username}_{safe}"[:128]


def gold_uri_for_registry(slug: str) -> str:
    return f"s3://{settings.S3_ASSETS_BUCKET}/gold/{GOLD_TABLE}/{slug}.parquet"


def load_column_map(uri: str, limit: int = 50_000) -> dict[str, tuple[list, str]]:
    from app.modules.factory.engine import _connect

    con = _connect()
    try:
        safe = uri.replace("'", "''")
        lower = uri.lower()
        rel = f"read_parquet('{safe}')" if lower.endswith(".parquet") else f"read_csv_auto('{safe}')"
        df = con.execute(f"SELECT * FROM {rel} LIMIT {limit};").df()
    finally:
        con.close()
    out: dict[str, tuple[list, str]] = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            out[col] = (df[col].dropna().astype(float).tolist(), "numeric")
        else:
            out[col] = (df[col].dropna().astype(str).tolist(), "categorical")
    return out


def infer_features(
    ref_cols: dict[str, tuple[list, str]],
    cur_cols: dict[str, tuple[list, str]],
) -> list[dict]:
    names = [c for c in ref_cols if c in cur_cols and c not in {"label", "prediction"}]
    return [{"name": n, "kind": ref_cols[n][1]} for n in names[:20]]


def model_level_metrics(cur_cols: dict[str, tuple[list, str]]) -> list[dict]:
    if "label" not in cur_cols or "prediction" not in cur_cols:
        return []
    labels = cur_cols["label"][0]
    preds = cur_cols["prediction"][0]
    n = min(len(labels), len(preds))
    if not n:
        return []
    acc = sum(1 for i in range(n) if labels[i] == preds[i]) / n
    return [{"metric": "accuracy", "value": acc}]


async def resolve_source_uri(db: AsyncSession, source_id: str) -> str:
    from app.modules.factory.engine import _resolve_source

    reader, _, _ = await _resolve_source(db, source_id)
    if "('" in reader and reader.endswith("')"):
        return reader.split("('", 1)[1].rsplit("'", 1)[0]
    raise ValueError("Tidak bisa mengekstrak URI dari sumber data")


async def resolve_submission_uri(sub: Submission) -> str:
    if not sub.file_key:
        raise ValueError("Submission tidak punya file")
    if settings.STORAGE_ENABLED:
        return f"s3://{settings.S3_SUBMISSIONS_BUCKET}/{sub.file_key}"
    raise ValueError("Storage tidak aktif")


async def resolve_repo_artifact_uri(repo: Repo) -> str:
    files = repo.files or []
    if not files:
        raise ValueError("Repo model tidak punya file")
    f = files[0]
    path_key = f.get("path_key") or f"repos/{repo.id}/{f.get('path', 'model.pkl')}"
    if settings.STORAGE_ENABLED:
        return f"s3://{settings.S3_ASSETS_BUCKET}/{path_key}"
    url = f.get("url")
    if url:
        return url
    raise ValueError("Storage tidak aktif")


async def can_edit_registry(db: AsyncSession, reg: ModelRegistry, user: User) -> None:
    from app.core.errors import ApiError

    if reg.owner_id == user.id:
        return
    if reg.team_id and await membership(db, reg.team_id, user.id):
        return
    raise ApiError(403, "forbidden", "Tidak berhak mengelola registry ini")


async def get_registry_by_slug(db: AsyncSession, slug: str) -> ModelRegistry:
    from app.core.errors import ApiError

    reg = (await db.execute(select(ModelRegistry).where(ModelRegistry.slug == slug))).scalar_one_or_none()
    if not reg:
        raise ApiError(404, "not_found", "Registry model tidak ditemukan")
    return reg
