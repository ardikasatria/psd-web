"""Pembangun kunci cache deterministik (Langkah 58)."""
from __future__ import annotations


def widget_key(run_id: str, widget: str) -> str:
    return f"widget:{run_id}:{widget}"


def widget_run_prefix(run_id: str) -> str:
    return f"widget:{run_id}:"


def schema_key(source: str) -> str:
    return f"schema:{source}"
