"""Klien async untuk Gitea HTTP API v1."""
from __future__ import annotations

import base64
import secrets

import httpx


def b64(content: str | bytes) -> str:
    raw = content.encode("utf-8") if isinstance(content, str) else content
    return base64.b64encode(raw).decode("ascii")


class GiteaError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Gitea API {status}: {body}")
        self.status = status
        self.body = body


class GiteaClient:
    def __init__(self, base_url: str, token: str, *, transport=None, client=None):
        self._client = client or httpx.AsyncClient(
            base_url=base_url.rstrip("/") + "/api/v1",
            headers={
                "Authorization": f"token {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            transport=transport,
            timeout=60.0,
        )

    async def aclose(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.aclose()

    async def _req(self, method: str, url: str, **kw) -> httpx.Response:
        r = await self._client.request(method, url, **kw)
        if r.status_code >= 400:
            raise GiteaError(r.status_code, r.text)
        return r

    async def ensure_user(
        self, *, username: str, email: str, full_name: str = ""
    ) -> dict:
        try:
            r = await self._req(
                "POST",
                "/admin/users",
                json={
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                    "must_change_password": False,
                    "password": secrets.token_urlsafe(32),
                    "login_name": username,
                    "source_id": 0,
                },
            )
            return r.json()
        except GiteaError as e:
            if e.status in (422, 409):
                r = await self._req("GET", f"/users/{username}")
                return r.json()
            raise

    async def create_user_repo(
        self,
        owner: str,
        name: str,
        *,
        private=True,
        default_branch="main",
        description="",
        auto_init=True,
    ) -> dict:
        r = await self._req(
            "POST",
            f"/admin/users/{owner}/repos",
            json={
                "name": name,
                "private": private,
                "default_branch": default_branch,
                "description": description,
                "auto_init": auto_init,
            },
        )
        return r.json()

    async def create_org_repo(
        self,
        org: str,
        name: str,
        *,
        private=True,
        default_branch="main",
        description="",
        auto_init=True,
    ) -> dict:
        r = await self._req(
            "POST",
            f"/orgs/{org}/repos",
            json={
                "name": name,
                "private": private,
                "default_branch": default_branch,
                "description": description,
                "auto_init": auto_init,
            },
        )
        return r.json()

    async def get_repo(self, owner: str, repo: str) -> dict:
        r = await self._req("GET", f"/repos/{owner}/{repo}")
        return r.json()

    async def change_files(
        self,
        owner: str,
        repo: str,
        *,
        message: str,
        files: list[dict],
        branch: str = "main",
    ) -> dict:
        r = await self._req(
            "POST",
            f"/repos/{owner}/{repo}/contents",
            json={"branch": branch, "message": message, "files": files},
        )
        return r.json()

    async def list_contents(
        self, owner: str, repo: str, path: str = "", ref: str | None = None
    ) -> list | dict:
        params = {"ref": ref} if ref else None
        r = await self._req(
            "GET", f"/repos/{owner}/{repo}/contents/{path}", params=params
        )
        return r.json()

    async def get_raw(
        self, owner: str, repo: str, path: str, ref: str | None = None
    ) -> bytes:
        params = {"ref": ref} if ref else None
        r = await self._req(
            "GET", f"/repos/{owner}/{repo}/raw/{path}", params=params
        )
        return r.content

    async def compare(self, owner: str, repo: str, base: str, head: str) -> dict:
        r = await self._req("GET", f"/repos/{owner}/{repo}/compare/{base}...{head}")
        return r.json()

    # --- Pull request & kontribusi (Langkah 51) ---

    async def fork(
        self,
        owner: str,
        repo: str,
        *,
        organization: str | None = None,
        name: str | None = None,
    ) -> dict:
        body: dict = {}
        if organization:
            body["organization"] = organization
        if name:
            body["name"] = name
        r = await self._req("POST", f"/repos/{owner}/{repo}/forks", json=body)
        return r.json()

    async def create_branch(self, owner: str, repo: str, *, new: str, old: str) -> dict:
        r = await self._req(
            "POST",
            f"/repos/{owner}/{repo}/branches",
            json={"new_branch_name": new, "old_branch_name": old},
        )
        return r.json()

    async def create_pull(
        self,
        owner: str,
        repo: str,
        *,
        title: str,
        head: str,
        base: str,
        body: str = "",
    ) -> dict:
        r = await self._req(
            "POST",
            f"/repos/{owner}/{repo}/pulls",
            json={"title": title, "head": head, "base": base, "body": body},
        )
        return r.json()

    async def get_pull(self, owner: str, repo: str, index: int) -> dict:
        r = await self._req("GET", f"/repos/{owner}/{repo}/pulls/{index}")
        return r.json()

    async def list_pulls(self, owner: str, repo: str, *, state: str = "open") -> list:
        r = await self._req("GET", f"/repos/{owner}/{repo}/pulls", params={"state": state})
        return r.json()

    async def merge_pull(
        self,
        owner: str,
        repo: str,
        index: int,
        *,
        method: str = "merge",
        delete_branch: bool = False,
        title: str | None = None,
        message: str | None = None,
    ) -> bool:
        body: dict = {"Do": method, "delete_branch_after_merge": delete_branch}
        if title:
            body["MergeTitleField"] = title
        if message:
            body["MergeMessageField"] = message
        r = await self._req(
            "POST", f"/repos/{owner}/{repo}/pulls/{index}/merge", json=body
        )
        return r.status_code in (200, 201)

    async def create_review(
        self,
        owner: str,
        repo: str,
        index: int,
        *,
        event: str,
        body: str = "",
        comments: list[dict] | None = None,
    ) -> dict:
        payload: dict = {"event": event, "body": body}
        if comments:
            payload["comments"] = comments
        r = await self._req(
            "POST", f"/repos/{owner}/{repo}/pulls/{index}/reviews", json=payload
        )
        return r.json()

    async def list_reviews(self, owner: str, repo: str, index: int) -> list:
        r = await self._req("GET", f"/repos/{owner}/{repo}/pulls/{index}/reviews")
        return r.json()

    async def create_comment(self, owner: str, repo: str, index: int, *, body: str) -> dict:
        r = await self._req(
            "POST",
            f"/repos/{owner}/{repo}/issues/{index}/comments",
            json={"body": body},
        )
        return r.json()


def make_operations(files: list[dict], operation: str = "create") -> list[dict]:
    ops = []
    for f in files:
        ops.append(
            {
                "operation": operation,
                "path": f["path"],
                "content": b64(f["content"]),
            }
        )
    return ops
