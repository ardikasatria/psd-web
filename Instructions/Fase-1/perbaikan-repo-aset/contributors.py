"""
Agregasi kontributor aset: gabungкан author commit (Gitea) + anggota Tim (/teams),
dedupe per username, urut jumlah commit (desc). Anggota tim tanpa commit tetap tampil.
"""
from __future__ import annotations


def aggregate_contributors(commit_authors: list[dict],
                           team_members: list[dict] | None = None) -> list[dict]:
    """
    commit_authors: [{username, commits?, avatar_url?}]
    team_members:   [{username, avatar_url?, team?}]
    """
    rows: dict[str, dict] = {}

    for a in commit_authors:
        u = a["username"]
        r = rows.setdefault(u, {"username": u, "commits": 0, "avatar_url": None,
                                "team": None, "is_team_member": False})
        r["commits"] += a.get("commits", 1)
        if a.get("avatar_url"):
            r["avatar_url"] = a["avatar_url"]

    for m in (team_members or []):
        u = m["username"]
        r = rows.setdefault(u, {"username": u, "commits": 0, "avatar_url": None,
                                "team": None, "is_team_member": False})
        r["is_team_member"] = True
        r["team"] = m.get("team")
        if m.get("avatar_url") and not r["avatar_url"]:
            r["avatar_url"] = m["avatar_url"]

    out = list(rows.values())
    out.sort(key=lambda c: (c["commits"], c["username"]), reverse=True)
    return out
