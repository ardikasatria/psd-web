"""
Asisten dalam-platform (Langkah 57, sub-langkah 2).

Menjawab pertanyaan & mengarahkan ke fitur PSD. Setiap panggilan:
  1. Gating kuota AI per tier (rem biaya).
  2. Rakit pesan: system (peran on-platform) + konteks fitur/pengguna + pertanyaan.
  3. Panggil LLM (llm_fn diinject; nyata: OpenAI).

llm_fn(messages) -> str.
"""
from __future__ import annotations

from .quota import check_and_consume

SYSTEM_PROMPT = (
    "Anda asisten Projek Sains Data (PSD), platform sains data berbahasa Indonesia. "
    "Jawab ringkas dan jelas dalam Bahasa Indonesia. Bila relevan, arahkan pengguna "
    "ke fitur PSD yang tepat (dataset, course, kompetisi, ruang, notebook). "
    "Jangan mengarang fitur yang tidak ada pada konteks yang diberikan."
)


def build_messages(question: str, context: dict | None, *, system: str = SYSTEM_PROMPT) -> list[dict]:
    messages = [{"role": "system", "content": system}]
    if context:
        ctx = "Konteks:\n" + "\n".join(f"- {k}: {v}" for k, v in context.items())
        messages.append({"role": "system", "content": ctx})
    messages.append({"role": "user", "content": question})
    return messages


class AIAssistant:
    def __init__(self, llm_fn, store):
        self.llm_fn = llm_fn
        self.store = store

    def answer(self, *, user_id: str, tier: str, question: str,
               context: dict | None = None) -> dict:
        quota = check_and_consume(self.store, user_id, tier)   # raise QuotaExceeded bila habis
        messages = build_messages(question, context)
        reply = self.llm_fn(messages)
        return {"reply": reply, "quota": quota}
