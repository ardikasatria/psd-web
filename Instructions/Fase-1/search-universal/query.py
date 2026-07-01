"""
Parsing query pencarian universal.

Mendukung operator: `type:kompetisi`, `@username` (akun), `#tag`, `owner:nama`.
Sisanya jadi teks bebas. Mengembalikan {text, filters}.
"""
from __future__ import annotations

# Alias tipe → kind kanonik (ID & EN, jamak/tunggal).
_TYPE_ALIASES = {
    "user": "user", "users": "user", "akun": "user", "account": "user", "accounts": "user",
    "project": "project", "projects": "project", "proyek": "project",
    "model": "model", "models": "model",
    "dataset": "dataset", "datasets": "dataset",
    "competition": "competition", "competitions": "competition", "kompetisi": "competition",
    "event": "event", "events": "event", "acara": "event",
    "team": "team", "teams": "team", "tim": "team",
    "forum": "forum", "thread": "forum", "threads": "forum",
    "notebook": "notebook", "notebooks": "notebook",
    "org": "org", "orgs": "org", "organization": "org", "organizations": "org", "organisasi": "org",
    "post": "post", "posts": "post", "postingan": "post", "feed": "post", "posting": "post",
}


def normalize_kind(t: str) -> str:
    t = (t or "").lower()
    return _TYPE_ALIASES.get(t, t.rstrip("s"))


def parse_query(raw: str) -> dict:
    filters: dict = {}
    text_parts: list[str] = []
    for tok in (raw or "").split():
        low = tok.lower()
        if low.startswith("type:") and len(tok) > 5:
            filters["type"] = normalize_kind(tok[5:])
        elif low.startswith("owner:") and len(tok) > 6:
            filters["owner"] = tok[6:]
        elif tok.startswith("@") and len(tok) > 1:
            filters["type"] = "user"
            text_parts.append(tok[1:])
        elif tok.startswith("#") and len(tok) > 1:
            filters.setdefault("tags", []).append(tok[1:].lower())
        else:
            text_parts.append(tok)
    return {"text": " ".join(text_parts), "filters": filters}
