from openai import OpenAI

from app.core.config import settings

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY tidak dikonfigurasi")
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def chat_json(system: str, user: str, max_tokens: int = 1800):
    r = _get_client().chat.completions.create(
        model=settings.AI_MODEL,
        temperature=0.4,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
    )
    return r.choices[0].message.content, r.usage


def chat_messages(messages: list[dict], *, max_tokens: int = 800) -> str:
    """Panggilan chat umum untuk asisten (Langkah 57)."""
    r = _get_client().chat.completions.create(
        model=settings.AI_MODEL,
        temperature=0.5,
        messages=messages,
        max_tokens=max_tokens,
    )
    return r.choices[0].message.content or ""
