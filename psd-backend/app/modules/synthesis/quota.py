from app.modules.gamification.tiers import tier_for

SYNTH_TIER = {
    "Pemula": {"plans_per_day": 3, "max_rows": 2_000},
    "Kontributor": {"plans_per_day": 15, "max_rows": 20_000},
    "Ahli": {"plans_per_day": 40, "max_rows": 100_000},
    "Master": {"plans_per_day": 100, "max_rows": 500_000},
    "Grandmaster": {"plans_per_day": 300, "max_rows": 1_000_000},
}


def quota_for(user):
    tier_name = tier_for(user.reputation or 0)["name"]
    return SYNTH_TIER.get(tier_name, SYNTH_TIER["Pemula"])
