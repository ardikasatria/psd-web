"""
Klien Gitea (admin API) untuk mengelola kunci SSH milik pengguna atas nama PSD.

Auth: token admin Gitea (Langkah 50) → header `Authorization: token <ADMIN_TOKEN>`.
Endpoint:
  - Tambah : POST   /api/v1/admin/users/{username}/keys   {title, key, read_only}
  - Daftar : GET    /api/v1/users/{username}/keys
  - Hapus  : DELETE /api/v1/admin/users/{username}/keys/{id}
"""
from __future__ import annotations

import httpx


class GiteaError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Gitea {status}: {body}")
        self.status = status


class GiteaKeysClient:
    def __init__(self, base_url: str, admin_token: str, *, transport=None, client=None):
        self._c = client or httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"token {admin_token}",
                     "Content-Type": "application/json"},
            transport=transport, timeout=30.0)

    def _req(self, method, url, **kw):
        r = self._c.request(method, url, **kw)
        if r.status_code >= 400:
            raise GiteaError(r.status_code, r.text)
        return r

    def add_key(self, username: str, title: str, public_key: str, *, read_only: bool = False) -> dict:
        return self._req("POST", f"/api/v1/admin/users/{username}/keys",
                         json={"title": title, "key": public_key, "read_only": read_only}).json()

    def list_keys(self, username: str) -> list:
        return self._req("GET", f"/api/v1/users/{username}/keys").json()

    def delete_key(self, username: str, key_id: int) -> None:
        self._req("DELETE", f"/api/v1/admin/users/{username}/keys/{key_id}")
