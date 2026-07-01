"""
Mesin QUEST generik + seed quest Pabrik Data.

Quest: {id, title, description, criteria:{event:target}, reward_points, repeatable}.
Progres dihitung dari counter event pengguna; selesai bila semua kriteria terpenuhi;
reward bisa diklaim sekali (atau berulang bila repeatable).
"""
from __future__ import annotations


def apply_event(counters: dict, event: str, n: int = 1) -> dict:
    c = dict(counters)
    c[event] = c.get(event, 0) + n
    return c


def progress(quest: dict, counters: dict) -> dict:
    crit = quest["criteria"]
    items, completed = [], True
    for ev, target in crit.items():
        cur = counters.get(ev, 0)
        if cur < target:
            completed = False
        items.append({"event": ev, "current": min(cur, target), "target": target})
    total_target = sum(crit.values()) or 1
    total_cur = sum(min(counters.get(ev, 0), t) for ev, t in crit.items())
    return {"items": items, "percent": round(total_cur / total_target, 4),
            "completed": completed}


def is_complete(quest: dict, counters: dict) -> bool:
    return progress(quest, counters)["completed"]


def claimable(quest: dict, counters: dict, claimed_ids) -> bool:
    if not is_complete(quest, counters):
        return False
    if quest.get("repeatable"):
        return True
    return quest["id"] not in set(claimed_ids)


def reward_points(quest: dict) -> int:
    return quest.get("reward_points", 0)


# Seed quest Pabrik Data (dorong penggunaan dua engine).
DF_QUESTS = [
    {"id": "df_first_pipeline", "title": "Analis Pemula",
     "description": "Jalankan pipeline Pabrik Data pertamamu.",
     "criteria": {"df_pipeline_run_success": 1}, "reward_points": 20},
    {"id": "df_sql_explorer", "title": "Penjelajah SQL",
     "description": "Gunakan node SQL sebanyak 3 kali.",
     "criteria": {"df_sql_node_used": 3}, "reward_points": 30},
    {"id": "df_go_spark", "title": "Naik ke Spark",
     "description": "Jalankan pipeline di engine Spark.",
     "criteria": {"df_spark_run_success": 1}, "reward_points": 50},
    {"id": "df_data_producer", "title": "Produsen Data",
     "description": "Hasilkan dataset dari pipeline (lapisan gold).",
     "criteria": {"df_dataset_published": 1}, "reward_points": 40},
    {"id": "df_pipeline_streak", "title": "Rajin Mengolah",
     "description": "Jalankan 10 pipeline sukses.",
     "criteria": {"df_pipeline_run_success": 10}, "reward_points": 60},
]
