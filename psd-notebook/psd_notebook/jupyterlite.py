"""Konfigurasi runtime browser (JupyterLite + Pyodide)."""
from __future__ import annotations

from psd_notebook.policy import limits_for

PYODIDE_PACKAGES = ["pandas", "numpy", "scikit-learn", "matplotlib", "micropip"]


def browser_config(tier: str, *, api_base: str) -> dict:
    lim = limits_for(tier)
    return {
        "runtime": "browser",
        "engine": "jupyterlite-pyodide",
        "packages": PYODIDE_PACKAGES,
        "api_base": api_base,
        "sdk": "psd-lite",
        "max_notebooks": lim.max_notebooks,
        "gpu": 0,
    }
