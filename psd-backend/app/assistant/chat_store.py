"""Penyimpanan percakapan asisten (in-memory; ganti DB bila migrasi siap)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from . import history
from .window_quota import WindowState

_conversations: dict[str, list[dict]] = {}
_messages: dict[str, list[dict]] = {}
_windows: dict[str, WindowState] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_window(user_id: str) -> WindowState:
    return _windows.get(user_id, WindowState())


def set_window(user_id: str, state: WindowState) -> None:
    _windows[user_id] = state


def list_conversations(user_id: str) -> list[dict]:
    return sorted(_conversations.get(user_id, []), key=lambda c: c["updated_at"], reverse=True)


def new_conversation(user_id: str, *, tier: str) -> dict:
    now = _now().isoformat()
    conv = {"id": f"ac_{uuid.uuid4().hex[:12]}", "title": "Chat baru", "updated_at": now}
    _conversations.setdefault(user_id, []).insert(0, conv)
    _messages[conv["id"]] = []
    _, max_hist = history.memory_limits_for(tier)
    kept = {c["id"] for c in history.prune_history(_conversations[user_id], max_conversations=max_hist)}
    _conversations[user_id] = [c for c in _conversations[user_id] if c["id"] in kept]
    for cid in list(_messages):
        if cid not in kept:
            _messages.pop(cid, None)
    return conv


def get_conversation(user_id: str, conv_id: str) -> dict | None:
    conv = next((c for c in _conversations.get(user_id, []) if c["id"] == conv_id), None)
    if not conv:
        return None
    return {"id": conv_id, "messages": list(_messages.get(conv_id, []))}


def delete_conversation(user_id: str, conv_id: str) -> bool:
    lst = _conversations.get(user_id, [])
    before = len(lst)
    _conversations[user_id] = [c for c in lst if c["id"] != conv_id]
    _messages.pop(conv_id, None)
    return len(_conversations[user_id]) < before


def append_messages(user_id: str, conv_id: str, user_msg: str, assistant_msg: str) -> None:
    conv = next((c for c in _conversations.get(user_id, []) if c["id"] == conv_id), None)
    if not conv:
        return
    thread = _messages.setdefault(conv_id, [])
    thread.append({"role": "user", "content": user_msg})
    thread.append({"role": "assistant", "content": assistant_msg})
    if conv["title"] == "Chat baru":
        conv["title"] = user_msg[:48] + ("…" if len(user_msg) > 48 else "")
    conv["updated_at"] = _now().isoformat()
