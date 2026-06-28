"""Backward-compatible re-exports — gunakan psd_gamification sebagai sumber tunggal."""
from psd_gamification.badges import achievement_badges
from psd_gamification.data import load_manifest
from psd_gamification.points import award as reputation_award
from psd_gamification.points import reputation_points
from psd_gamification.tiers import perks_for_reputation as perks_for
from psd_gamification.tiers import tier_for_reputation as tier_for

TIERS = [(t["min_reputation"], t["label"]) for t in load_manifest()["tiers"]]

__all__ = ["TIERS", "tier_for", "perks_for", "reputation_points", "reputation_award", "achievement_badges"]
