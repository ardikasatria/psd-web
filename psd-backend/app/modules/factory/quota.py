from psd_gamification import quota as gq
from psd_gamification.tiers import tier_for_reputation


def quota_for(user) -> dict:
    slug = tier_for_reputation(getattr(user, "reputation", 0) or 0)["slug"]
    return {
        "runs_per_day": int(gq.quota("factory.runs_per_day", slug)),
        "max_rows": int(gq.quota("factory.max_rows", slug)),
        "max_nodes": int(gq.quota("factory.max_nodes", slug)),
    }
