"""Endpoint asisten & feed personal (Langkah 57)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant import chat_store, feed as feed_mod, history, panel as panel_mod, recommend, window_quota
from app.assistant.affinity import build_affinity
from app.assistant.assistant import AIAssistant, build_messages
from app.assistant.data import (
    fetch_activity_summary,
    fetch_candidates,
    fetch_popularity,
    fetch_user_state,
    fetch_viewed_ids,
)
from app.assistant.deps import get_assistant, get_quota_store
from app.assistant.quota import QuotaExceeded, limit_for
from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.hub.tiers import hub_tier_for_reputation
from app.modules.users.models import User

router = APIRouter(prefix="/api", tags=["assistant"])

DEFAULT_KINDS = ("dataset", "course", "kompetisi", "ruang")


def _tier(user: User) -> str:
    return hub_tier_for_reputation(user.reputation or 0)


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AskReq(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    context: dict | None = None


class SendMsgReq(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    context: dict | None = None


@router.get("/assistant/panel")
async def assistant_panel(user: User = Depends(get_current_user)):
    tier = _tier(user)
    state = chat_store.get_window(user.id)
    return panel_mod.panel_state(state, _now(), tier=tier)


@router.get("/assistant/conversations")
async def list_conversations(user: User = Depends(get_current_user)):
    return chat_store.list_conversations(user.id)


@router.post("/assistant/conversations")
async def create_conversation(user: User = Depends(get_current_user)):
    return chat_store.new_conversation(user.id, tier=_tier(user))


@router.get("/assistant/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: User = Depends(get_current_user)):
    conv = chat_store.get_conversation(user.id, conv_id)
    if not conv:
        raise ApiError(404, "not_found", "Percakapan tidak ditemukan")
    return conv


@router.delete("/assistant/conversations/{conv_id}")
async def remove_conversation(conv_id: str, user: User = Depends(get_current_user)):
    if not chat_store.delete_conversation(user.id, conv_id):
        raise ApiError(404, "not_found", "Percakapan tidak ditemukan")
    return {"ok": True}


@router.post("/assistant/conversations/{conv_id}/messages")
async def send_message(
    conv_id: str,
    body: SendMsgReq,
    user: User = Depends(get_current_user),
    assistant: AIAssistant = Depends(get_assistant),
):
    if not settings.PSD_ASSISTANT_ENABLED:
        raise ApiError(503, "assistant_disabled", "Asisten AI tidak aktif.")
    if not settings.OPENAI_API_KEY:
        raise ApiError(503, "openai_missing", "OPENAI_API_KEY belum dikonfigurasi.")

    conv = chat_store.get_conversation(user.id, conv_id)
    if not conv:
        raise ApiError(404, "not_found", "Percakapan tidak ditemukan")

    tier = _tier(user)
    now = _now()
    state = chat_store.get_window(user.id)
    preview = window_quota.view(state, now, tier=tier)
    if not preview.can_send:
        raise ApiError(
            429,
            "quota_exhausted",
            "Kuota chat Anda habis untuk jendela ini.",
            details={
                "reset_at": preview.reset_at.isoformat() if preview.reset_at else None,
                "limit": preview.limit,
                "window_hours": preview.window_hours,
            },
        )
    new_state, _ = window_quota.consume(state, now, tier=tier)
    chat_store.set_window(user.id, new_state)

    ctx_max, _ = history.memory_limits_for(tier)
    content = body.content.strip()
    prior = conv["messages"]
    model_msgs = history.trim_context(
        prior + [{"role": "user", "content": content}],
        max_messages=ctx_max,
    )
    if not model_msgs or model_msgs[0].get("role") != "system":
        base = build_messages(content, body.context)
        system = [m for m in base if m["role"] == "system"]
        model_msgs = system + history.trim_context(
            prior + [{"role": "user", "content": content}],
            max_messages=ctx_max,
        )

    try:
        reply = assistant.llm_fn(model_msgs)
    except RuntimeError as e:
        raise ApiError(503, "assistant_error", str(e))

    chat_store.append_messages(user.id, conv_id, content, reply)
    panel = panel_mod.panel_state(chat_store.get_window(user.id), _now(), tier=tier)
    return {"reply": reply, "panel": panel}


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
