"""
Ekstraksi record dari respons API + ROUTING hasil ke aset DATASET (bukan disimpan sendiri).
"""
from __future__ import annotations

import re

OUTPUT_FORMATS = {"csv", "jsonl", "parquet"}
OUTPUT_MODES = {"new", "version"}   # dataset baru ATAU versi baru dataset yang ada


def get_by_path(payload, path: str):
    """Ambil nilai lewat path bertitik, mis. 'data.items'. None bila tak ada."""
    cur = payload
    for part in (path.split(".") if path else []):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def extract_records(payload, records_path: str | None = None,
                    field_map: dict | None = None) -> list[dict]:
    raw = get_by_path(payload, records_path) if records_path else payload
    if raw is None:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    if not isinstance(raw, list):
        return []
    rows = []
    for item in raw:
        if field_map:
            rows.append({out: get_by_path(item, src) for out, src in field_map.items()})
        elif isinstance(item, dict):
            rows.append(item)
        else:
            rows.append({"value": item})
    return rows


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "panen"


def output_filename(job_name: str, fmt: str, timestamp: str) -> str:
    if fmt not in OUTPUT_FORMATS:
        raise ValueError(f"format tak dikenal: {fmt}")
    return f"{slugify(job_name)}-{timestamp}.{fmt}"


def output_target(*, mode: str, owner: str, dataset_slug: str | None = None,
                  new_name: str | None = None) -> dict:
    """
    Tentukan tujuan penyimpanan di aset DATASET user.
    - mode 'new'     → buat dataset baru (slug dari new_name).
    - mode 'version' → tambah versi ke dataset_slug yang sudah ada.
    """
    if mode == "new":
        if not new_name:
            raise ValueError("new_name wajib untuk mode 'new'")
        return {"mode": "new", "owner": owner, "dataset_slug": slugify(new_name)}
    if mode == "version":
        if not dataset_slug:
            raise ValueError("dataset_slug wajib untuk mode 'version'")
        return {"mode": "version", "owner": owner, "dataset_slug": dataset_slug}
    raise ValueError(f"mode tak dikenal: {mode}")
