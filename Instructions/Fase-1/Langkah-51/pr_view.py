"""Pemetaan PR untuk UI PSD (daftar & detail + ringkasan review)."""
from __future__ import annotations

from .client import GiteaPRClient

_REVIEW_RANK = {"APPROVED": 2, "REQUEST_CHANGES": 1, "COMMENT": 0, "PENDING": 0}


async def list_pulls(client: GiteaPRClient, owner: str, repo: str,
                     state: str = "open") -> list[dict]:
    pulls = await client.list_pulls(owner, repo, state=state)
    return [
        {"number": p["number"], "title": p["title"], "state": p["state"],
         "author": (p.get("user") or {}).get("login"),
         "head": (p.get("head") or {}).get("label"),
         "base": (p.get("base") or {}).get("label"),
         "mergeable": p.get("mergeable")}
        for p in pulls
    ]


async def pull_detail(client: GiteaPRClient, owner: str, repo: str, index: int) -> dict:
    pr = await client.get_pull(owner, repo, index)
    reviews = await client.list_reviews(owner, repo, index)
    summary = {"approved": 0, "changes_requested": 0, "comments": 0}
    for r in reviews:
        st = (r.get("state") or "").upper()
        if st == "APPROVED":
            summary["approved"] += 1
        elif st in ("REQUEST_CHANGES", "CHANGES_REQUESTED"):
            summary["changes_requested"] += 1
        elif st == "COMMENT":
            summary["comments"] += 1
    return {
        "number": pr["number"], "title": pr["title"], "state": pr["state"],
        "merged": pr.get("merged", False), "mergeable": pr.get("mergeable"),
        "author": (pr.get("user") or {}).get("login"),
        "reviews": summary,
        "can_merge": bool(pr.get("mergeable")) and summary["changes_requested"] == 0
                     and not pr.get("merged", False),
    }
