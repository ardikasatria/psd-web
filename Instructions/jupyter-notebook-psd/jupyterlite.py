"""
Konfigurasi runtime browser (JupyterLite + Pyodide).

JupyterLite = aset statis yang disajikan app PSD (biaya server ~nol). Kernel jalan
di browser pengguna via Pyodide. Akses dataset memakai **SDK browser `psd-lite`**
yang mengambil presigned URL dari API PSD (perlu CORS ke MinIO).
"""
from __future__ import annotations

from .policy import limits_for

# Paket Pyodide yang umum & kompatibel untuk pengajaran.
PYODIDE_PACKAGES = ["pandas", "numpy", "scikit-learn", "matplotlib", "micropip"]


def browser_config(tier: str, *, api_base: str) -> dict:
    lim = limits_for(tier)
    return {
        "runtime": "browser",
        "engine": "jupyterlite-pyodide",
        "packages": PYODIDE_PACKAGES,
        "api_base": api_base,            # untuk SDK psd-lite (ambil presigned URL)
        "sdk": "psd-lite",
        "max_notebooks": lim.max_notebooks,
        "gpu": 0,                        # CPU-only
    }
