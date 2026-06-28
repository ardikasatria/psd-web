"""
Cache khusus widget (Langkah 46) & introspeksi skema (Langkah 47).

Tipis di atas Cache + keys. Sertakan invalidasi:
  - invalidate_run: hapus semua widget satu run (mis. saat run dijalankan ulang).
  - invalidate_schema: hapus cache skema satu source (mis. saat skema berubah).
"""
from __future__ import annotations

from . import keys
from .cache import Cache

WIDGET_TTL = 3600       # 1 jam (sesuaikan dgn profil beban)
SCHEMA_TTL = 600        # 10 menit


def cached_widget(cache: Cache, run_id: str, widget: str, compute_fn, *,
                  ttl: int = WIDGET_TTL):
    value, _ = cache.get_or_set(keys.widget_key(run_id, widget), compute_fn, ttl=ttl)
    return value


def invalidate_run(cache: Cache, run_id: str) -> int:
    return cache.delete_prefix(keys.widget_run_prefix(run_id))


def cached_schema(cache: Cache, source: str, compute_fn, *, ttl: int = SCHEMA_TTL):
    value, _ = cache.get_or_set(keys.schema_key(source), compute_fn, ttl=ttl)
    return value


def invalidate_schema(cache: Cache, source: str) -> None:
    cache.delete(keys.schema_key(source))
