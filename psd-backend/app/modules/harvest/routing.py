"""Ekstraksi record dari respons API."""

from __future__ import annotations

import re

OUTPUT_FORMATS = {"csv", "jsonl", "parquet"}
OUTPUT_MODES = {"new", "version"}


def get_by_path(payload, path: str):
    cur = payload
    for part in (path.split(".") if path else []):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def extract_records(
    payload,
    records_path: str | None = None,
    field_map: dict | None = None,
) -> list[dict]:
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
