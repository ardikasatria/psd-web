"""Kapabilitas engine Pabrik Data per tier reputasi."""
from __future__ import annotations

from psd_gamification.tiers import tier_for_reputation

MB = 1024 * 1024
GB = 1024 * MB

_ENGINE_MATRIX: dict[str, dict[str, dict]] = {
    "pemula": {
        "duckdb": {"allowed": True, "max_runs_per_day": 5, "max_bytes": 200 * MB, "raw_sql": False},
        "spark": {"allowed": False, "max_runs_per_day": 0, "max_bytes": 0, "raw_sql": False, "raw_code": False},
    },
    "menengah": {
        "duckdb": {"allowed": True, "max_runs_per_day": 30, "max_bytes": 1 * GB, "raw_sql": True},
        "spark": {
            "allowed": True,
            "max_runs_per_day": 10,
            "max_bytes": 20 * GB,
            "raw_sql": True,
            "raw_code": False,
        },
    },
    "lanjut": {
        "duckdb": {"allowed": True, "max_runs_per_day": 100, "max_bytes": 5 * GB, "raw_sql": True},
        "spark": {
            "allowed": True,
            "max_runs_per_day": 50,
            "max_bytes": 200 * GB,
            "raw_sql": True,
            "raw_code": True,
            "kernel_required": True,
        },
    },
}

_TIER_LABEL = {"pemula": "Pemula", "menengah": "Menengah", "lanjut": "Lanjut"}


def _factory_tier_slug(reputation: int) -> str:
    slug = tier_for_reputation(reputation or 0)["slug"]
    if slug == "pemula":
        return "pemula"
    if slug in ("kontributor", "ahli"):
        return "menengah"
    return "lanjut"


def engine_limits_for_user(user, *, estimated_bytes: int | None = None) -> dict:
    tier_key = _factory_tier_slug(getattr(user, "reputation", 0) or 0)
    engines = _ENGINE_MATRIX[tier_key]
    est = estimated_bytes if estimated_bytes is not None else (120 * MB if tier_key == "pemula" else 800 * MB)
    suggested = "spark" if est >= 5 * GB else "duckdb"
    return {
        "tier": tier_key,
        "tier_label": _TIER_LABEL[tier_key],
        "estimated_bytes": est,
        "suggested_engine": suggested,
        "engines": engines,
    }


def effective_engine(requested: str | None, pipeline_engine: str | None, suggested: str) -> str:
    eng = (requested or pipeline_engine or "auto").lower()
    if eng in ("duckdb", "spark"):
        return eng
    return suggested if suggested in ("duckdb", "spark") else "duckdb"
