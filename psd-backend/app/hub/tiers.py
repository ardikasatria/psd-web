"""JupyterHub integration — tier slug dari gamifikasi PSD (Langkah 52)."""
from __future__ import annotations

from psd_gamification.seams import user_tier_slug_from_reputation


def hub_tier_for_reputation(reputation: int) -> str:
    """Tier kanonik (pemula → grandmaster) untuk klaim OIDC psd_tier & kuota."""
    return user_tier_slug_from_reputation(reputation)
