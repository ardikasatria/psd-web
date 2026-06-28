"""Tampilan daftar file / diff via Gitea API."""
from __future__ import annotations

from app.gitea.client import GiteaClient


async def list_files(
    client: GiteaClient, owner: str, repo: str, path: str = "", ref: str | None = None
) -> list[dict]:
    items = await client.list_contents(owner, repo, path, ref)
    if isinstance(items, dict):
        items = [items]
    return [
        {
            "name": it["name"],
            "path": it["path"],
            "type": it["type"],
            "size": it.get("size"),
            "sha": it.get("sha"),
        }
        for it in items
    ]


async def get_file_text(
    client: GiteaClient, owner: str, repo: str, path: str, ref: str | None = None
) -> str:
    raw = await client.get_raw(owner, repo, path, ref)
    return raw.decode("utf-8", errors="replace")


async def get_diff(
    client: GiteaClient, owner: str, repo: str, base: str, head: str
) -> dict:
    data = await client.compare(owner, repo, base, head)
    files = data.get("files", []) if isinstance(data, dict) else []
    return {
        "total_commits": data.get("total_commits") if isinstance(data, dict) else None,
        "files": [
            {
                "filename": f.get("filename"),
                "status": f.get("status"),
                "additions": f.get("additions"),
                "deletions": f.get("deletions"),
            }
            for f in files
        ],
    }
