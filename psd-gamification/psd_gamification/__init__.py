"""Sumber kebenaran tunggal gamifikasi PSD — tier, kuota, poin, badge."""

from psd_gamification import quota as quota_module
from psd_gamification.data import load_manifest
from psd_gamification.quota import QuotaExceeded, check_and_consume, validate_matrix
from psd_gamification.quota import quota as quota_lookup
from psd_gamification.tiers import (
    tier_for_reputation,
    tier_label_for_slug,
    tier_slug_for_level,
    tier_slug_for_reputation,
)

__all__ = [
    "load_manifest",
    "quota_module",
    "quota_lookup",
    "tier_for_reputation",
    "tier_slug_for_reputation",
    "tier_slug_for_level",
    "tier_label_for_slug",
    "check_and_consume",
    "validate_matrix",
    "QuotaExceeded",
]
