"""Row-Level Security per tim (Langkah 53)."""
from __future__ import annotations


def team_rls(team_id, *, column: str = "team_id", dataset_id: int | None = None) -> list[dict]:
    try:
        tid = int(team_id)
    except (TypeError, ValueError):
        raise ValueError("team_id harus integer (mencegah injeksi RLS).")
    if not column.isidentifier():
        raise ValueError("nama kolom RLS tidak valid.")
    rule: dict = {"clause": f"{column} = {tid}"}
    if dataset_id is not None:
        rule["dataset"] = int(dataset_id)
    return [rule]
