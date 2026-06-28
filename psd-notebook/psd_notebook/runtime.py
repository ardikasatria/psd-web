"""Pemilih runtime hybrid — browser (JupyterLite) vs kernel server."""
from __future__ import annotations

from psd_notebook.policy import NotebookQuotaError, limits_for


def choose_runtime(tier: str, requested: str | None = None) -> str:
    lim = limits_for(tier)
    if lim.runtime == "browser":
        if requested == "server":
            raise NotebookQuotaError(
                f"Kernel server belum tersedia untuk tier '{tier}'. "
                f"Naikkan tier untuk membukanya."
            )
        return "browser"
    if requested in ("browser", "server"):
        return requested
    return "server" if lim.runtime in ("server", "both") else "browser"
