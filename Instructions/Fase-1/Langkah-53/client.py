"""
Klien REST Superset (Langkah 53).

Memakai akun layanan (admin) untuk:
  - provisioning dataset terhadap skema gold,
  - mengaktifkan embedding pada dashboard (dapat UUID),
  - mencetak guest token (dengan RLS) untuk embedding sisi-pengguna.

Auth: JWT Bearer (login) + X-CSRFToken untuk request mutasi.
Transport dapat di-inject untuk pengujian.
"""
from __future__ import annotations

import httpx


class SupersetError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Superset API {status}: {body}")
        self.status = status
        self.body = body


class SupersetClient:
    def __init__(self, api_url: str, username: str, password: str, *,
                 provider: str = "db", transport=None, client=None):
        self._client = client or httpx.AsyncClient(
            base_url=api_url.rstrip("/"), transport=transport, timeout=30.0,
        )
        self._username = username
        self._password = password
        self._provider = provider
        self._access: str | None = None
        self._csrf: str | None = None

    async def aclose(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.aclose()

    # ---------------- auth ----------------
    async def _ensure_login(self):
        if self._access:
            return
        r = await self._client.post("/api/v1/security/login", json={
            "username": self._username, "password": self._password,
            "provider": self._provider, "refresh": True,
        })
        if r.status_code >= 400:
            raise SupersetError(r.status_code, r.text)
        self._access = r.json()["access_token"]

    async def _ensure_csrf(self):
        if self._csrf:
            return
        r = await self._client.get("/api/v1/security/csrf_token/",
                                   headers={"Authorization": f"Bearer {self._access}"})
        if r.status_code >= 400:
            raise SupersetError(r.status_code, r.text)
        self._csrf = r.json()["result"]

    def _headers(self, csrf: bool = False) -> dict:
        h = {"Authorization": f"Bearer {self._access}", "Content-Type": "application/json"}
        if csrf and self._csrf:
            h["X-CSRFToken"] = self._csrf
        return h

    async def _post(self, url: str, json: dict, *, csrf: bool = True) -> httpx.Response:
        await self._ensure_login()
        if csrf:
            await self._ensure_csrf()
        r = await self._client.post(url, json=json, headers=self._headers(csrf))
        if r.status_code >= 400:
            raise SupersetError(r.status_code, r.text)
        return r

    # ---------------- provisioning ----------------
    async def create_dataset(self, *, database_id: int, schema: str, table_name: str) -> dict:
        r = await self._post("/api/v1/dataset/", {
            "database": database_id, "schema": schema, "table_name": table_name,
        })
        return r.json()

    async def enable_embedded(self, dashboard_id: int, allowed_domains: list[str]) -> str:
        r = await self._post(f"/api/v1/dashboard/{dashboard_id}/embedded",
                             {"allowed_domains": allowed_domains})
        return r.json()["result"]["uuid"]

    # ---------------- guest token (RLS) ----------------
    async def guest_token(self, *, user: dict, resources: list[dict], rls: list[dict]) -> str:
        # Endpoint guest token: Bearer cukup; CSRF biasanya dikecualikan.
        r = await self._post("/api/v1/security/guest_token/", {
            "user": user, "resources": resources, "rls": rls,
        }, csrf=False)
        return r.json()["token"]
