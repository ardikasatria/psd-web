"""JupyterHub integration — dataset resolve & tier mapping (Langkah 52)."""
from __future__ import annotations

from app.modules.gamification.tiers import tier_for


def hub_tier_for_reputation(reputation: int) -> str:
    """Map tier gamifikasi PSD → tier notebook (pemula/menengah/lanjut)."""
    level = tier_for(reputation or 0)["level"]
    if level <= 1:
        return "pemula"
    if level == 2:
        return "menengah"
    return "lanjut"
