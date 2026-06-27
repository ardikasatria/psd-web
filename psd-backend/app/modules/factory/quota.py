from app.modules.gamification.tiers import tier_for

PIPELINE_TIER = {
    "Pemula": {"runs_per_day": 5, "max_rows": 50_000, "max_nodes": 8},
    "Kontributor": {"runs_per_day": 15, "max_rows": 200_000, "max_nodes": 15},
    "Ahli": {"runs_per_day": 40, "max_rows": 1_000_000, "max_nodes": 25},
    "Master": {"runs_per_day": 120, "max_rows": 5_000_000, "max_nodes": 40},
    "Grandmaster": {"runs_per_day": 400, "max_rows": 20_000_000, "max_nodes": 80},
}


def quota_for(user) -> dict:
    tier_name = tier_for(getattr(user, "reputation", 0) or 0)["name"]
    return PIPELINE_TIER.get(tier_name, PIPELINE_TIER["Pemula"])
