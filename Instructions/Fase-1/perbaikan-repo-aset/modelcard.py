"""
Parsing "kartu" model/dataset gaya Hugging Face: README.md dengan front-matter YAML
(diapit '---'). Mengembalikan (metadata, body_markdown). Body dirender di tab README.
"""
from __future__ import annotations

import yaml


def parse_front_matter(text: str) -> tuple[dict, str]:
    if not text or not text.lstrip().startswith("---"):
        return {}, text or ""
    # buang spasi awal sebelum '---' pertama
    stripped = text.lstrip("\n")
    lines = stripped.split("\n")
    if lines[0].strip() != "---":
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text
    fm_block = "\n".join(lines[1:end])
    body = "\n".join(lines[end + 1:]).lstrip("\n")
    try:
        meta = yaml.safe_load(fm_block) or {}
    except yaml.YAMLError:
        meta = {}
    if not isinstance(meta, dict):
        meta = {}
    return meta, body


# Field kartu yang umum ditonjolkan di header aset (HF-like).
CARD_HIGHLIGHT = ["license", "tags", "language", "datasets", "metrics",
                  "library_name", "pipeline_tag", "task_categories"]


def card_summary(meta: dict) -> dict:
    return {k: meta[k] for k in CARD_HIGHLIGHT if k in meta}
