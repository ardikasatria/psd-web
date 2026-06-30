"""
Batas MEMORI (konteks dikirim ke model) & HISTORI (jumlah percakapan disimpan).

- trim_context : simpan system prompt + N pesan terakhir (hemat token & privasi).
- prune_history: simpan M percakapan terbaru; sisanya dipangkas.
Per tier; refresh halaman boleh memulai chat baru.
"""
from __future__ import annotations

# (maks_pesan_konteks, maks_percakapan_histori) per tier.
MEMORY_LIMITS: dict[str, tuple[int, int]] = {
    "pemula":   (10, 5),
    "menengah": (20, 20),
    "lanjut":   (40, 100),
}
DEFAULT_TIER = "pemula"


def memory_limits_for(tier: str) -> tuple[int, int]:
    return MEMORY_LIMITS.get((tier or "").lower(), MEMORY_LIMITS[DEFAULT_TIER])


def trim_context(messages: list[dict], *, max_messages: int) -> list[dict]:
    """Pertahankan system prompt (bila ada di awal) + `max_messages` pesan terbaru lainnya."""
    if not messages:
        return []
    system = []
    rest = messages
    if messages[0].get("role") == "system":
        system = [messages[0]]
        rest = messages[1:]
    kept = rest[-max_messages:] if max_messages >= 0 else rest
    return system + kept


def prune_history(conversations: list[dict], *, max_conversations: int) -> list[dict]:
    """Simpan `max_conversations` percakapan terbaru (berdasar updated_at)."""
    ordered = sorted(conversations, key=lambda c: c.get("updated_at", ""), reverse=True)
    return ordered[:max_conversations]
