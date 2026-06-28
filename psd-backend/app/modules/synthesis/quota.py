from psd_gamification import quota as gq
from psd_gamification.tiers import tier_for_reputation


def quota_for(user):
    slug = tier_for_reputation(user.reputation or 0)["slug"]
    return {
        "plans_per_day": int(gq.quota("synthesis.plans_per_day", slug)),
        "max_rows": int(gq.quota("synthesis.max_rows", slug)),
    }
