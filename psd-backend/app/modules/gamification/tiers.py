TIERS = [(0, "Pemula"), (50, "Kontributor"), (250, "Ahli"), (1000, "Master"), (5000, "Grandmaster")]


def tier_for(rep: int) -> dict:
    idx = 0
    for i, (threshold, _) in enumerate(TIERS):
        if rep >= threshold:
            idx = i
    return {
        "level": idx,
        "name": TIERS[idx][1],
        "reputation": rep,
        "next_at": TIERS[idx + 1][0] if idx + 1 < len(TIERS) else None,
    }


def perks_for(rep: int) -> dict:
    lvl = tier_for(rep)["level"]

    def pick(arr):
        return arr[min(lvl, len(arr) - 1)]

    return {
        "upload_max_mb": pick([50, 100, 200, 500, 1000]),
        "daily_submission_bonus": pick([0, 2, 5, 10, 20]),
        "notebook_quota": pick([5, 20, 50, 100, 1000]),
        "event_priority": lvl >= 2,
        "can_create_event": lvl >= 3,
        "daily_post_limit": pick([5, 15, 30, 60, 100]),
        "post_image_max": pick([1, 4, 6, 8, 10]),
    }
