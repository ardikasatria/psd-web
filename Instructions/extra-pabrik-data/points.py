"""
Poin aktivitas Pabrik Data → gamifikasi pusat (Langkah 25).
Aktivitas memberi poin yang menaikkan tier, membuka engine/kapabilitas lebih tinggi.
"""
from __future__ import annotations

# event → poin
DF_EVENTS = {
    "df_pipeline_created": 5,
    "df_pipeline_run_success": 10,
    "df_sql_node_used": 3,
    "df_spark_run_success": 20,
    "df_dataset_published": 25,     # hasil pipeline dijadikan aset dataset
    "df_quest_completed": 0,        # reward quest ditambahкан terpisah (quests.py)
}


def points_for(event: str) -> int:
    return DF_EVENTS.get(event, 0)


def award(event: str, *, count: int = 1) -> int:
    """Total poin untuk event (kali count). Panggil gamifikasi pusat untuk mencatat."""
    return points_for(event) * max(0, count)
