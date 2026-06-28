"""
Endpoint asisten & feed (Langkah 57).

POST /api/assistant/ask  — tanya asisten (gated kuota tier).
GET  /api/feed           — feed personal (rekomendasi + langkah berikutnya).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import feed as feed_mod
from . import recommend, seams
from .affinity import build_affinity
from .assistant import AIAssistant
from .quota import QuotaExceeded

router = APIRouter(prefix="/api", tags=["assistant"])


class AskReq(BaseModel):
    question: str
    context: dict | None = None


async def get_current_user():
    raise NotImplementedError("Sambungkan ke sesi pengguna PSD.")


async def get_assistant() -> AIAssistant:
    raise NotImplementedError("Sediakan AIAssistant (llm_fn + store).")


@router.post("/assistant/ask")
async def ask(body: AskReq, user=Depends(get_current_user),
              assistant: AIAssistant = Depends(get_assistant)):
    try:
        return assistant.answer(user_id=seams.user_id(user), tier=seams.user_tier(user),
                                question=body.question, context=body.context)
    except QuotaExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/feed")
async def feed(user=Depends(get_current_user),
               kinds: str = "dataset,course,kompetisi,ruang"):
    uid = seams.user_id(user)
    profile = build_affinity(seams.activity_summary(uid))
    recs: dict[str, list] = {}
    for kind in [k for k in kinds.split(",") if k]:
        rec = recommend.recommend(
            profile, seams.candidate_items(kind),
            popularity=seams.popularity(kind), k=5, per_category_cap=3)
        recs[kind] = rec["items"]
    steps = feed_mod.next_steps(seams.user_state(uid))
    return {"feed": feed_mod.build_feed(recs, steps),
            "strategy": "popularity" if profile.is_cold() else "affinity"}
