"""
Pembangun kunci cache deterministik (Langkah 58).

Widget per (run_id, widget) → Langkah 46.
Introspeksi skema per source → Langkah 47.
Prefix dipakai untuk invalidasi massal (mis. saat run berubah).
"""
from __future__ import annotations


def widget_key(run_id: str, widget: str) -> str:
    return f"widget:{run_id}:{widget}"


def widget_run_prefix(run_id: str) -> str:
    return f"widget:{run_id}:"


def schema_key(source: str) -> str:
    return f"schema:{source}"
