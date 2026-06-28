"""
Job Pabrik Data penghitung drift (Langkah 55, sub-langkah 2).

Untuk satu (model, versi): hitung drift tiap fitur → baris monitoring → tulis ke
gold. Drift signifikan → alert. Dijalankan via Celery (Langkah 49, antrian
'pabrik_data').
"""
from __future__ import annotations

from app.mlops import drift, monitoring, seams


def compute_drift(
    model_name: str,
    model_version: str,
    features: list[dict],
    *,
    write=None,
    alert=None,
) -> dict:
    """features: [{'name': str, 'kind': 'numeric'|'categorical'}, ...].

    Kembalikan {'rows': [...], 'alerts': [...]}.
    """
    write = write or seams.write_monitoring_rows
    rows: list[dict] = []

    for feat in features:
        name, kind = feat["name"], feat.get("kind", "numeric")
        ref = seams.load_reference(model_name, model_version, name)
        cur = seams.load_current(model_name, model_version, name)

        if kind == "categorical":
            psi = drift.psi_categorical(ref, cur)
            rows.append(
                monitoring.drift_row(
                    model_name=model_name,
                    model_version=model_version,
                    feature=name,
                    metric="psi",
                    value=psi,
                    status=drift.classify_psi(psi),
                )
            )
        else:
            psi = drift.psi_numeric(ref, cur)
            rows.append(
                monitoring.drift_row(
                    model_name=model_name,
                    model_version=model_version,
                    feature=name,
                    metric="psi",
                    value=psi,
                    status=drift.classify_psi(psi),
                )
            )
            ks = drift.ks_statistic(ref, cur)
            rows.append(
                monitoring.drift_row(
                    model_name=model_name,
                    model_version=model_version,
                    feature=name,
                    metric="ks",
                    value=ks,
                    status="ok",
                )
            )

    write(rows)
    alerts = monitoring.collect_alerts(rows)
    if alert:
        for a in alerts:
            alert(a)
    return {"rows": rows, "alerts": alerts}
