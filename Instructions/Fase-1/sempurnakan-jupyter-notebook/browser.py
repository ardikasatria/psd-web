"""
Adapter async Pyodide untuk `psd-lite` (dijalankan DI BROWSER, bukan diuji di CPython).

Di JupyterLite/Pyodide, pemanggilan jaringan bersifat async (pyodide.http.pyfetch).
Bungkus logika inti sdk.py dengan fetch async. Token PSD pengguna diinjeksikan saat
kernel browser di-bootstrap (mis. lewat variabel global yang diset PSD).

Contoh pemakaian di sel notebook:
    import psd
    df = await psd.load("psd://contoh/iris/iris.csv")
"""
from __future__ import annotations

# CATATAN: modul ini hanya berjalan di Pyodide. Jangan diimpor di server.
import io

import pandas as pd

from .sdk import PsdUriError, parse_uri

API_BASE = ""      # diisi saat bootstrap (PSD)
AUTH_TOKEN = ""    # diisi saat bootstrap (PSD)


async def _pyfetch(url, **kw):
    from pyodide.http import pyfetch  # type: ignore
    return await pyfetch(url, **kw)


async def _presign(uri: str) -> str:
    parse_uri(uri)
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"} if AUTH_TOKEN else {}
    resp = await _pyfetch(f"{API_BASE.rstrip('/')}/api/storage/presign?uri={uri}",
                          headers=headers)
    data = await resp.json()
    if "url" not in data:
        raise PsdUriError("Respons presign tanpa 'url'.")
    return data["url"]


async def load(uri: str) -> pd.DataFrame:
    url = await _presign(uri)
    resp = await _pyfetch(url)
    raw = await resp.bytes()
    _, _, path = parse_uri(uri)
    ext = path.rsplit(".", 1)[-1].lower()
    buf = io.BytesIO(raw)
    if ext == "csv":
        return pd.read_csv(buf)
    if ext in ("parquet", "pq"):
        return pd.read_parquet(buf)
    if ext == "json":
        return pd.read_json(buf)
    raise PsdUriError(f"Format tak didukung: .{ext}")
