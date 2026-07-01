"""
Paginasi panen + kesopanan (rate limit).

Strategi: page | offset | cursor | none. Berhenti bila: batch kosong, capai max_pages,
capai max_records, atau cursor habis. min_interval menjaga jeda antar-permintaan.
"""
from __future__ import annotations


def next_request_params(*, strategy: str, pages_done: int, page_size: int,
                        next_cursor: str | None) -> dict:
    if strategy == "page":
        return {"page": pages_done + 1}
    if strategy == "offset":
        return {"offset": pages_done * page_size, "limit": page_size}
    if strategy == "cursor":
        return {"cursor": next_cursor}
    return {}   # none / permintaan tunggal


def should_continue(*, strategy: str, pages_done: int, records_done: int,
                    last_batch_size: int, next_cursor: str | None,
                    max_pages: int | None, max_records: int | None) -> bool:
    if last_batch_size == 0:
        return False
    if strategy == "none":
        return False
    if max_pages is not None and pages_done >= max_pages:
        return False
    if max_records is not None and records_done >= max_records:
        return False
    if strategy == "cursor" and not next_cursor:
        return False
    return True


def min_interval_seconds(requests_per_minute: float) -> float:
    """Jeda minimum antar-permintaan agar sopan pada server sumber."""
    if requests_per_minute <= 0:
        return 0.0
    return 60.0 / requests_per_minute
