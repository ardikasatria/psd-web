"""
Klien async untuk Gitea HTTP API (v1).

Dipakai untuk provisioning (buat user/repo), migrasi (impor files[] jadi commit),
dan tampilan file/diff. Auth memakai token admin: header `Authorization: token <T>`.

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
            timeout=30.0,
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

    # ---------------- user / org ----------------
    async def ensure_user(self, *, username: str, email: str, full_name: str = "") -> dict:
        """Buat user Gitea (idempoten). must_change_password=False; tanpa password
        login (login via OIDC PSD). Abaikan bila sudah ada."""
        try:
            r = await self._req("POST", "/admin/users", json={
                "username": username, "email": email, "full_name": full_name,
                "must_change_password": False, "password": _random_password(),
                "login_name": username, "source_id": 0,
            })
            return r.json()
        except GiteaError as e:
            if e.status in (422,):  # sudah ada
                r = await self._req("GET", f"/users/{username}")
                return r.json()
            raise

    # ---------------- repo ----------------
    async def create_user_repo(self, owner: str, name: str, *, private=True,
                               default_branch="main", description="", auto_init=True) -> dict:
        """Admin membuat repo milik `owner` (pengguna)."""
        r = await self._req("POST", f"/admin/users/{owner}/repos", json={
            "name": name, "private": private, "default_branch": default_branch,
            "description": description, "auto_init": auto_init,
        })
        return r.json()

    async def create_org_repo(self, org: str, name: str, *, private=True,
                              default_branch="main", description="", auto_init=True) -> dict:
        r = await self._req("POST", f"/orgs/{org}/repos", json={
            "name": name, "private": private, "default_branch": default_branch,
            "description": description, "auto_init": auto_init,
        })
        return r.json()

    async def get_repo(self, owner: str, repo: str) -> dict:
        r = await self._req("GET", f"/repos/{owner}/{repo}")
        return r.json()

    # ---------------- contents (commit) ----------------
    async def change_files(self, owner: str, repo: str, *, message: str,
                           files: list[dict], branch: str = "main") -> dict:
        """Satu commit berisi banyak operasi file (create/update/delete).

        `files`: [{"operation":"create","path":"a.py","content":"<base64>"}, ...]
        Endpoint batch Gitea: POST /repos/{owner}/{repo}/contents
        """
        r = await self._req("POST", f"/repos/{owner}/{repo}/contents", json={
            "branch": branch, "message": message, "files": files,
        })
        return r.json()

    async def list_contents(self, owner: str, repo: str, path: str = "",
                            ref: str | None = None) -> list | dict:
        params = {"ref": ref} if ref else None
        r = await self._req("GET", f"/repos/{owner}/{repo}/contents/{path}", params=params)
        return r.json()

    async def get_raw(self, owner: str, repo: str, path: str, ref: str | None = None) -> bytes:
        params = {"ref": ref} if ref else None
        r = await self._req("GET", f"/repos/{owner}/{repo}/raw/{path}", params=params)
        return r.content

    async def compare(self, owner: str, repo: str, base: str, head: str) -> dict:
        r = await self._req("GET", f"/repos/{owner}/{repo}/compare/{base}...{head}")
        return r.json()


def _random_password(n: int = 32) -> str:
    import secrets
    return secrets.token_urlsafe(n)


def make_operations(files: list[dict], operation: str = "create") -> list[dict]:
    """Bangun daftar operasi untuk change_files dari files[] PSD.

    files[]: [{"path": "...", "content": "<teks/bytes>"}].
    """
    ops = []
    for f in files:
        ops.append({"operation": operation, "path": f["path"], "content": b64(f["content"])})
    return ops
