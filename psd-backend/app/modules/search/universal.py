"""Format respons pencarian universal — kompatibel dengan kontrak frontend Langkah 34."""

from __future__ import annotations

from typing import Any

# Alias `type=` (ID/EN) → kind kanonik.
TYPE_ALIASES: dict[str, str] = {
    "user": "user",
    "users": "user",
    "akun": "user",
    "pengguna": "user",
    "competition": "competition",
    "competitions": "competition",
    "kompetisi": "competition",
    "project": "project",
    "projects": "project",
    "proyek": "project",
    "repos": "project",
    "model": "model",
    "models": "model",
    "dataset": "dataset",
    "datasets": "dataset",
    "notebook": "notebook",
    "notebooks": "notebook",
    "event": "event",
    "events": "event",
    "acara": "event",
    "team": "team",
    "teams": "team",
    "tim": "team",
    "forum": "forum",
    "org": "org",
    "orgs": "org",
    "organisasi": "org",
    "post": "post",
    "posts": "post",
    "postingan": "post",
    "feed": "post",
}

REPO_KINDS = frozenset({"project", "dataset", "model"})


def normalize_type(type_param: str | None) -> str | None:
    if not type_param:
        return None
    return TYPE_ALIASES.get(type_param.lower(), type_param.lower())


def _repo_path_prefix(kind: str) -> str:
    if kind == "dataset":
        return "datasets"
    if kind == "model":
        return "models"
    return "projects"


def hit_from_repo(doc: dict[str, Any]) -> dict[str, Any]:
    kind = doc.get("kind") or "project"
    if kind not in REPO_KINDS:
        kind = "project"
    slug = doc.get("slug") or doc.get("id", "")
    return {
        "kind": kind,
        "id": str(doc["id"]),
        "title": doc.get("name") or slug,
        "subtitle": doc.get("description") or doc.get("owner"),
        "url": f"/{_repo_path_prefix(kind)}/{slug}",
    }


def hit_from_competition(doc: dict[str, Any]) -> dict[str, Any]:
    slug = doc.get("slug") or doc.get("id", "")
    return {
        "kind": "competition",
        "id": str(doc["id"]),
        "title": doc.get("title") or slug,
        "subtitle": doc.get("sponsor"),
        "url": f"/competitions/{slug}",
    }


def hit_from_user(doc: dict[str, Any]) -> dict[str, Any]:
    username = doc.get("username") or doc.get("id", "")
    return {
        "kind": "user",
        "id": str(doc["id"]),
        "title": doc.get("name") or username,
        "subtitle": f"@{username}",
        "url": f"/{username}",
        "avatar_url": doc.get("avatar_url"),
        "is_official": bool(doc.get("is_official")),
    }


def group_by_kind(hits: list[dict[str, Any]], per_category: int) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for hit in hits:
        bucket = grouped.setdefault(hit["kind"], [])
        if len(bucket) < per_category:
            bucket.append(hit)
    return grouped


def build_response(
    q: str,
    hits: list[dict[str, Any]],
    *,
    limit: int,
    per_category: int,
) -> dict[str, Any]:
    return {
        "query": {"text": q, "filters": {}},
        "total": len(hits),
        "results": hits[:limit],
        "grouped": group_by_kind(hits, per_category),
    }
