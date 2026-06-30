"""Urutan antrian tiket pengaduan."""
from __future__ import annotations

PRIORITY_RANK = {"kritis": 0, "tinggi": 1, "sedang": 2, "rendah": 3}


def sort_tickets(tickets: list[dict]) -> list[dict]:
    return sorted(
        tickets,
        key=lambda t: (
            PRIORITY_RANK.get(t.get("priority", "sedang"), 2),
            t.get("created_at", ""),
        ),
    )
