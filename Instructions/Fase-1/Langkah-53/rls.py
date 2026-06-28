"""
Row-Level Security per tim (Langkah 53, sub-langkah 3).

KEAMANAN: klausa RLS masuk ke guest token & menentukan baris yang terlihat tiap
tim. team_id WAJIB integer — cegah injeksi SQL melalui klausa.
"""
from __future__ import annotations


def team_rls(team_id, *, column: str = "team_id", dataset_id: int | None = None) -> list[dict]:
    """Bangun aturan RLS untuk satu tim.

    Mengembalikan [{'clause': 'team_id = 7'}] (opsional di-scope ke dataset).
    Raise ValueError bila team_id bukan integer (mencegah injeksi).
    """
    try:
        tid = int(team_id)
    except (TypeError, ValueError):
        raise ValueError("team_id harus integer (mencegah injeksi RLS).")
    if not column.isidentifier():
        raise ValueError("nama kolom RLS tidak valid.")
    rule: dict = {"clause": f"{column} = {tid}"}
    if dataset_id is not None:
        rule["dataset"] = int(dataset_id)   # batasi aturan ke dataset tertentu
    return [rule]
