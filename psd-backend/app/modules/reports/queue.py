"""Urutan antrian moderasi laporan."""
from __future__ import annotations


def sort_moderation(reports: list[dict]) -> list[dict]:
    return sorted(
        reports,
        key=lambda r: (
            not r.get("flagged", False),
            -r.get("report_count", 0),
            r.get("created_at", ""),
        ),
    )
