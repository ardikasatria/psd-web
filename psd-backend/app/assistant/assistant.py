"""Asisten dalam-platform gated kuota (Langkah 57)."""
from __future__ import annotations

from .quota import check_and_consume

SYSTEM_PROMPT = (
    "Anda asisten Projek Sains Data (PSD), platform sains data berbahasa Indonesia. "
    "Jawab ringkas dan jelas dalam Bahasa Indonesia. Bila relevan, arahkan pengguna "
    "ke fitur PSD yang tepat (dataset, course, kompetisi, ruang ide, notebook, pabrik data, "
    "ruang analitik, registry model). Jangan mengarang fitur yang tidak ada pada konteks."
)

PLATFORM_CONTEXT = {
    "fitur": "dataset, model, kompetisi, course, notebook, ruang ide, pabrik data, ruang analitik, registry ML",
    "navigasi": "dashboard, explore, forum, leaderboard, /assistant, /ml",
}


def build_messages(question: str, context: dict | None, *, system: str = SYSTEM_PROMPT) -> list[dict]:
    messages = [{"role": "system", "content": system}]
    merged = {**PLATFORM_CONTEXT, **(context or {})}
    if merged:
        ctx = "Konteks:\n" + "\n".join(f"- {k}: {v}" for k, v in merged.items())
        messages.append({"role": "system", "content": ctx})
    messages.append({"role": "user", "content": question})
    return messages


class AIAssistant:
    def __init__(self, llm_fn, store):
        self.llm_fn = llm_fn
        self.store = store

    def answer(self, *, user_id: str, tier: str, question: str, context: dict | None = None) -> dict:
        quota = check_and_consume(self.store, user_id, tier)
        messages = build_messages(question, context)
        reply = self.llm_fn(messages)
        return {"reply": reply, "quota": quota}
