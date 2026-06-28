"""
Pemilih runtime hybrid (revisi Langkah 52).

- Tier 'browser'  → selalu JupyterLite (browser). Permintaan 'server' DITOLAK.
- Tier 'server'/'both' → boleh pilih; default 'server' (sudah berhak compute nyata).

Tujuan: tier rendah gratis (browser), tier tinggi buka kernel server (gated kuota).
"""
from __future__ import annotations

from .policy import NotebookQuotaError, limits_for


def choose_runtime(tier: str, requested: str | None = None) -> str:
    lim = limits_for(tier)
    if lim.runtime == "browser":
        if requested == "server":
            raise NotebookQuotaError(
                f"Kernel server belum tersedia untuk tier '{tier}'. "
                f"Naikkan tier untuk membukanya.")
        return "browser"
    # tier punya server/both
    if requested in ("browser", "server"):
        return requested
    return "server" if lim.runtime in ("server", "both") else "browser"
