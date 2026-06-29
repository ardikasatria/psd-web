"""
SDK `psd-lite` — varian BROWSER dari SDK psd:// untuk runtime JupyterLite (Pyodide).

Murni-Python (kompatibel Pyodide). Logika inti memakai fungsi fetch yang DIINJEKSIKAN
agar bisa diuji di CPython biasa; adapter async Pyodide ada di browser.py.

Alur: parse URI → minta presigned URL ke API PSD → ambil byte → baca jadi DataFrame.
Tak ada kredensial penyimpanan di browser; akses lewat presigned URL berumur pendek.
"""
from __future__ import annotations

import io

import pandas as pd


class PsdUriError(ValueError):
    pass


def parse_uri(uri: str) -> tuple[str, str, str]:
    """psd://<owner>/<dataset>/<path/berkas> → (owner, dataset, path)."""
    if not isinstance(uri, str) or not uri.startswith("psd://"):
        raise PsdUriError("URI harus diawali 'psd://'.")
    rest = uri[len("psd://"):]
    parts = rest.split("/", 2)
    if len(parts) < 3 or not all(parts):
        raise PsdUriError("Format: psd://<owner>/<dataset>/<path/berkas>")
    owner, dataset, path = parts
    return owner, dataset, path


def presign(uri: str, *, api_base: str, fetch_json) -> str:
    """Minta presigned URL ke API PSD. fetch_json(url, params)->dict berisi {'url': ...}."""
    parse_uri(uri)  # validasi
    data = fetch_json(f"{api_base.rstrip('/')}/api/storage/presign", {"uri": uri})
    if "url" not in data:
        raise PsdUriError("Respons presign tidak memuat 'url'.")
    return data["url"]


def _read(raw: bytes, path: str) -> pd.DataFrame:
    ext = path.rsplit(".", 1)[-1].lower()
    buf = io.BytesIO(raw)
    if ext == "csv":
        return pd.read_csv(buf)
    if ext in ("parquet", "pq"):
        return pd.read_parquet(buf)
    if ext == "json":
        return pd.read_json(buf)
    raise PsdUriError(f"Format tak didukung: .{ext} (csv/parquet/json).")


def load(uri: str, *, api_base: str, fetch_json, fetch_bytes) -> pd.DataFrame:
    """Muat dataset jadi DataFrame. fetch_bytes(url)->bytes."""
    url = presign(uri, api_base=api_base, fetch_json=fetch_json)
    raw = fetch_bytes(url)
    _, _, path = parse_uri(uri)
    return _read(raw, path)


def download(uri: str, *, api_base: str, fetch_json, fetch_bytes, dest: str | None = None) -> str:
    """Unduh berkas mentah ke `dest` (default: nama berkas). Kembalikan path."""
    url = presign(uri, api_base=api_base, fetch_json=fetch_json)
    raw = fetch_bytes(url)
    _, _, path = parse_uri(uri)
    dest = dest or path.rsplit("/", 1)[-1]
    with open(dest, "wb") as f:
        f.write(raw)
    return dest
