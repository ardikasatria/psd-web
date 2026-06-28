"""Endpoint asisten & feed personal (Langkah 57)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant import feed as feed_mod
from app.assistant import recommend
from app.assistant.affinity import build_affinity
from app.assistant.data import (
    fetch_activity_summary,
    fetch_candidates,
    fetch_popularity,
    fetch_user_state,
    fetch_viewed_ids,
)
from app.assistant.deps import get_assistant, get_quota_store
from app.assistant.quota import QuotaExceeded, limit_for
from app.assistant.assistant import AIAssistant
from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.hub.tiers import hub_tier_for_reputation
from app.modules.users.models import User

router = APIRouter(prefix="/api", tags=["assistant"])

DEFAULT_KINDS = ("dataset", "course", "kompetisi", "ruang")


class AskReq(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    context: dict | None = None


@router.get("/assistant/quota")
async def assistant_quota(user: User = Depends(get_current_user)):
    tier = hub_tier_for_reputation(user.reputation or 0)
    limit = limit_for(tier)
    store = get_quota_store()
    used = store.incr(user.id, 0)
    return {"tier": tier, "limit": limit, "used": used, "remaining": max(0, limit - used)}


@router.post("/assistant/ask")
async def ask(
    body: AskReq,
    user: User = Depends(get_current_user),
    assistant: AIAssistant = Depends(get_assistant),
):
    if not settings.PSD_ASSISTANT_ENABLED:
        raise ApiError(503, "assistant_disabled", "Asisten AI tidak aktif.")
    if not settings.OPENAI_API_KEY:
        raise ApiError(503, "openai_missing", "OPENAI_API_KEY belum dikonfigurasi.")

    tier = hub_tier_for_reputation(user.reputation or 0)
    try:
        return assistant.answer(
            user_id=user.id,
            tier=tier,
            question=body.question.strip(),
            context=body.context,
        )
    except QuotaExceeded as e:
        raise ApiError(429, "quota_exceeded", str(e))
    except RuntimeError as e:
        raise ApiError(503, "assistant_error", str(e))


@router.get("/feed")
async def feed(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    kinds: str = "dataset,course,kompetisi,ruang",
):
    if not settings.PSD_ASSISTANT_ENABLED:
        return {"feed": [], "strategy": "popularity"}

    summary = await fetch_activity_summary(db, user)
    profile = build_affinity(summary)
    viewed = await fetch_viewed_ids(db, user)

    recs: dict[str, list] = {}
    strategies: set[str] = set()
    for kind in [k.strip() for k in kinds.split(",") if k.strip()]:
        if kind not in DEFAULT_KINDS:
            continue
        result = recommend.recommend(
            profile,
            await fetch_candidates(db, kind),
            popularity=await fetch_popularity(db, kind),
            exclude_ids=viewed,
            k=5,
            per_category_cap=3,
        )
        recs[kind] = result["items"]
        strategies.add(result["strategy"])

    steps = feed_mod.next_steps(await fetch_user_state(db, user))
    strategy = "popularity" if profile.is_cold() or strategies == {"popularity"} else "affinity"
    if profile.is_cold():
        strategy = "popularity"

    return {
        "feed": feed_mod.build_feed(recs, steps),
        "strategy": strategy,
    }
