"""
PSD SDK — dipasang di image notebook (Langkah 52, sub-langkah 4).

Akses dataset lewat URI `psd://<owner>/<dataset>/<path>`:
    import psd
    df = psd.load("psd://budi/iris/iris.csv")
    path = psd.download("psd://budi/iris/iris.csv")

Resolusi: panggil API PSD (pakai PSD_TOKEN yang diinjeksikan spawner) untuk
mendapat presigned URL MinIO, lalu unduh. Tidak menyimpan kredensial MinIO di
notebook (hanya URL berumur pendek).
"""
from __future__ import annotations

import os
import tempfile

import httpx

SCHEME = "psd://"


def parse_uri(uri: str) -> tuple[str, str, str]:
    """psd://owner/dataset/path/ke/berkas → (owner, dataset, 'path/ke/berkas')."""
    if not uri.startswith(SCHEME):
        raise ValueError(f"URI harus diawali {SCHEME}: {uri!r}")
    rest = uri[len(SCHEME):]
    parts = [p for p in rest.split("/") if p != ""]
    if len(parts) < 3:
        raise ValueError(f"URI tidak lengkap (butuh owner/dataset/path): {uri!r}")
    owner, dataset, *path = parts
    return owner, dataset, "/".join(path)


class Resolver:
    def __init__(self, api_base: str | None = None, token: str | None = None,
                 http: httpx.Client | None = None):
        self.api_base = (api_base or os.environ.get("PSD_API_BASE", "")).rstrip("/")
        self.token = token or os.environ.get("PSD_TOKEN")
        self.http = http or httpx.Client(timeout=60.0)

    def resolve(self, uri: str) -> dict:
        """Kembalikan {presigned_url, content_type, ...} dari API PSD."""
        owner, dataset, path = parse_uri(uri)
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        r = self.http.get(
            f"{self.api_base}/api/datasets/{owner}/{dataset}/resolve",
            params={"path": path}, headers=headers,
        )
        r.raise_for_status()
        return r.json()


def download(uri: str, dest: str | None = None, *, resolver: Resolver | None = None) -> str:
    """Unduh objek `psd://` ke berkas lokal; kembalikan path."""
    resolver = resolver or Resolver()
    meta = resolver.resolve(uri)
    url = meta["presigned_url"]
    if dest is None:
        suffix = "." + uri.rsplit(".", 1)[-1] if "." in uri.rsplit("/", 1)[-1] else ""
        fd, dest = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
    resp = resolver.http.get(url)
    resp.raise_for_status()
    with open(dest, "wb") as f:
        f.write(resp.content)
    return dest


def load(uri: str, *, resolver: Resolver | None = None):
    """Muat dataset jadi objek pandas (csv/parquet/json)."""
    path = download(uri, resolver=resolver)
    import pandas as pd  # impor malas (hanya saat dipakai)
    if path.endswith(".parquet"):
        return pd.read_parquet(path)
    if path.endswith(".json"):
        return pd.read_json(path)
    return pd.read_csv(path)
