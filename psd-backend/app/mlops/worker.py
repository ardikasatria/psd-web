"""Worker drift monitoring (Langkah 55) — orkestrasi drift_job + seam gold."""
from __future__ import annotations

from sqlalchemy import select

from app.core.db import async_session
from app.mlops import drift_job, monitoring
from app.mlops.models import DriftReport, ModelRegistry, ModelVersion
from app.mlops.seams import (
    bind_drift_context,
    gold_uri_for_registry,
    infer_features,
    load_column_map,
    model_level_metrics,
    pop_drift_alerts,
    resolve_source_uri,
    resolve_submission_uri,
)
from app.modules.competitions.models import Submission
from app.tasks.seams import PermanentError, RetryableError, is_retryable


async def run_drift_job(
    report_id: str,
    *,
    current_source_id: str | None = None,
    submission_id: str | None = None,
    model_version: str | None = None,
):
    async with async_session() as db:
        report = (await db.execute(select(DriftReport).where(DriftReport.id == report_id))).scalar_one()
        reg = (await db.execute(select(ModelRegistry).where(ModelRegistry.id == report.registry_id))).scalar_one()
        report.status = "running"
        await db.commit()

        try:
            if not reg.reference_source_id:
                raise PermanentError("Registry belum punya reference_source_id untuk drift.")
            ref_uri = await resolve_source_uri(db, reg.reference_source_id)
            report.reference_uri = ref_uri

            if submission_id:
                sub = (await db.execute(select(Submission).where(Submission.id == submission_id))).scalar_one()
                cur_uri = await resolve_submission_uri(sub)
            elif current_source_id:
                cur_uri = await resolve_source_uri(db, current_source_id)
            else:
                raise PermanentError("current_source_id atau submission_id wajib untuk drift.")

            report.current_uri = cur_uri

            ref_cols = load_column_map(ref_uri)
            cur_cols = load_column_map(cur_uri)
            features = reg.features_json or infer_features(ref_cols, cur_cols)
            if not features:
                raise PermanentError("Tidak ada fitur untuk drift.")

            if not model_version:
                latest = (
                    await db.execute(
                        select(ModelVersion)
                        .where(ModelVersion.registry_id == reg.id)
                        .order_by(ModelVersion.version.desc())
                        .limit(1)
                    )
                ).scalar_one_or_none()
                model_version = latest.mlflow_model_version if latest and latest.mlflow_model_version else "1"

            gold_uri = reg.monitoring_gold_uri or gold_uri_for_registry(reg.slug)
            bind_drift_context(
                model_name=reg.mlflow_name,
                model_version=str(model_version),
                ref_cols=ref_cols,
                cur_cols=cur_cols,
                gold_uri=gold_uri,
            )

            result = drift_job.compute_drift(
                reg.mlflow_name,
                str(model_version),
                features=features,
            )

            extra_rows = [
                monitoring.metric_row(
                    model_name=reg.mlflow_name,
                    model_version=str(model_version),
                    metric=m["metric"],
                    value=m["value"],
                )
                for m in model_level_metrics(cur_cols)
            ]
            if extra_rows:
                from app.mlops import seams

                seams.write_monitoring_rows(extra_rows)
                result["rows"].extend(extra_rows)

            psi_rows = [r for r in result["rows"] if r.get("metric") == "psi"]
            report.overall_psi = max((r["value"] for r in psi_rows), default=0.0)
            acc_rows = [r for r in result["rows"] if r.get("feature") == "__model__" and r.get("metric") == "accuracy"]
            report.accuracy = acc_rows[0]["value"] if acc_rows else None
            report.metrics_json = {"rows": result["rows"], "alerts": result["alerts"]}
            report.status = "done"
            reg.monitoring_gold_uri = gold_uri
            await db.commit()

            alerts = pop_drift_alerts()
            if alerts:
                report.metrics_json["alert_count"] = len(alerts)
                await db.commit()

            from app.serving.retrain import maybe_trigger_retrain

            await maybe_trigger_retrain(db, reg)

        except (RetryableError, PermanentError):
            raise
        except Exception as e:
            if is_retryable(e):
                report.status = "queued"
                await db.commit()
                raise RetryableError(str(e)) from e
            report.status = "error"
            report.error = str(e)[:500]
            await db.commit()
            raise PermanentError(report.error) from e
