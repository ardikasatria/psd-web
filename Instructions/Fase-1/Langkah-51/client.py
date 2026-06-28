"""
Klien Gitea untuk alur kontribusi (Langkah 51) — perluasan klien Langkah 50.

Mencakup: fork, branch, commit (contents batch), pull request, review, merge.
Transport dapat di-inject untuk pengujian (httpx.MockTransport).
"""
from __future__ import annotations

import base64

import httpx


def b64(content: str | bytes) -> str:
    raw = content.encode("utf-8") if isinstance(content, str) else content
    return base64.b64encode(raw).decode("ascii")


class GiteaError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Gitea API {status}: {body}")
        self.status = status
        self.body = body


class GiteaPRClient:
    def __init__(self, base_url: str, token: str, *, transport=None, client=None):
        self._client = client or httpx.AsyncClient(
            base_url=base_url.rstrip("/") + "/api/v1",
            headers={"Authorization": f"token {token}",
                     "Content-Type": "application/json", "Accept": "application/json"},
            transport=transport, timeout=30.0,
        )

    async def aclose(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.aclose()

    async def _req(self, method, url, **kw) -> httpx.Response:
        r = await self._client.request(method, url, **kw)
        if r.status_code >= 400:
            raise GiteaError(r.status_code, r.text)
        return r

    # ---------------- fork ----------------
    async def fork(self, owner: str, repo: str, *, organization: str | None = None,
                   name: str | None = None) -> dict:
        body = {}
        if organization:
            body["organization"] = organization
        if name:
            body["name"] = name
        r = await self._req("POST", f"/repos/{owner}/{repo}/forks", json=body)
        return r.json()

    async def get_repo(self, owner: str, repo: str) -> dict:
        return (await self._req("GET", f"/repos/{owner}/{repo}")).json()

    # ---------------- branch ----------------
    async def create_branch(self, owner: str, repo: str, *, new: str, old: str) -> dict:
        r = await self._req("POST", f"/repos/{owner}/{repo}/branches",
                            json={"new_branch_name": new, "old_branch_name": old})
        return r.json()

    async def list_branches(self, owner: str, repo: str) -> list:
        return (await self._req("GET", f"/repos/{owner}/{repo}/branches")).json()

    # ---------------- commit ke branch ----------------
    async def change_files(self, owner: str, repo: str, *, message: str,
                           files: list[dict], branch: str) -> dict:
        r = await self._req("POST", f"/repos/{owner}/{repo}/contents",
                            json={"branch": branch, "message": message, "files": files})
        return r.json()

    # ---------------- pull request ----------------
    async def create_pull(self, owner: str, repo: str, *, title: str, head: str,
                          base: str, body: str = "") -> dict:
        """head bisa lintas-fork: 'kontributor:branch'."""
        r = await self._req("POST", f"/repos/{owner}/{repo}/pulls",
                            json={"title": title, "head": head, "base": base, "body": body})
        return r.json()

    async def get_pull(self, owner: str, repo: str, index: int) -> dict:
        return (await self._req("GET", f"/repos/{owner}/{repo}/pulls/{index}")).json()

    async def list_pulls(self, owner: str, repo: str, *, state: str = "open") -> list:
        r = await self._req("GET", f"/repos/{owner}/{repo}/pulls", params={"state": state})
        return r.json()

    async def merge_pull(self, owner: str, repo: str, index: int, *, method: str = "merge",
                         delete_branch: bool = False, title: str | None = None,
                         message: str | None = None) -> bool:
        body = {"Do": method, "delete_branch_after_merge": delete_branch}
        if title:
            body["MergeTitleField"] = title
        if message:
            body["MergeMessageField"] = message
        r = await self._req("POST", f"/repos/{owner}/{repo}/pulls/{index}/merge", json=body)
        return r.status_code in (200, 201)

    # ---------------- review ----------------
    async def create_review(self, owner: str, repo: str, index: int, *, event: str,
                            body: str = "", comments: list[dict] | None = None) -> dict:
        """event ∈ {APPROVE, REQUEST_CHANGES, COMMENT}."""
        payload = {"event": event, "body": body}
        if comments:
            payload["comments"] = comments
        r = await self._req("POST", f"/repos/{owner}/{repo}/pulls/{index}/reviews", json=payload)
        return r.json()

    async def list_reviews(self, owner: str, repo: str, index: int) -> list:
        return (await self._req("GET", f"/repos/{owner}/{repo}/pulls/{index}/reviews")).json()

    async def create_comment(self, owner: str, repo: str, index: int, *, body: str) -> dict:
        """Komentar umum pada PR/issue (PR adalah issue di Gitea)."""
        r = await self._req("POST", f"/repos/{owner}/{repo}/issues/{index}/comments",
                            json={"body": body})
        return r.json()


def make_operations(files: list[dict], operation: str = "create") -> list[dict]:
    return [{"operation": operation, "path": f["path"], "content": b64(f["content"])}
            for f in files]
