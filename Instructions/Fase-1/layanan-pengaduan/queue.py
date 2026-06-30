"""Urutan antrian petugas: tiket pengaduan & laporan moderasi."""
from __future__ import annotations

PRIORITY_RANK = {"kritis": 0, "tinggi": 1, "sedang": 2, "rendah": 3}


def sort_tickets(tickets: list[dict]) -> list[dict]:
    """Paling mendesak & paling lama dulu: prioritas tinggi → created_at awal."""
    return sorted(
        tickets,
        key=lambda t: (PRIORITY_RANK.get(t.get("priority", "sedang"), 2),
                       t.get("created_at", "")),
    )


def sort_moderation(reports: list[dict]) -> list[dict]:
    """Yang sudah auto-flag dulu, lalu pelapor terbanyak, lalu paling lama."""
    return sorted(
        reports,
        key=lambda r: (not r.get("flagged", False),
                       -r.get("report_count", 0),
                       r.get("created_at", "")),
    )
