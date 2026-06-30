"""Klien JupyterHub REST API (backend PSD sebagai service Hub)."""
from __future__ import annotations

import time

import httpx

from app.hub.hub_urls import server_ready


class HubError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"JupyterHub {status}: {body}")
        self.status = status
        self.body = body


class HubConnectionError(HubError):
    """Backend tidak bisa menjangkau JupyterHub (jaringan / layanan mati)."""

    def __init__(self, detail: str):
        super().__init__(503, detail)


class JupyterHubClient:
    def __init__(self, hub_api_url: str, api_token: str, *, transport=None, client=None):
        self._c = client or httpx.Client(
            base_url=hub_api_url.rstrip("/"),
            headers={
                "Authorization": f"token {api_token}",
                "Content-Type": "application/json",
            },
            transport=transport,
            timeout=30.0,
        )

    def _req(self, method, url, **kw):
        try:
            r = self._c.request(method, url, **kw)
        except httpx.TimeoutException as exc:
            raise HubError(504, f"timeout: {exc}") from exc
        except httpx.RequestError as exc:
            raise HubConnectionError(str(exc)) from exc
        if r.status_code >= 400:
            raise HubError(r.status_code, r.text)
        return r

    def create_user(self, name: str) -> dict:
        return self._req("POST", f"/users/{name}").json()

    def ensure_user(self, name: str) -> dict:
        try:
            return self.get_user(name)
        except HubError as exc:
            if exc.status == 404:
                return self.create_user(name)
            raise

    def get_user(self, name: str) -> dict:
        return self._req("GET", f"/users/{name}").json()

    def start_server(self, name: str, server_name: str = "") -> int:
        path = f"/users/{name}/server" if not server_name else f"/users/{name}/servers/{server_name}"
        return self._req("POST", path).status_code

    def stop_server(self, name: str, server_name: str = "") -> None:
        path = f"/users/{name}/server" if not server_name else f"/users/{name}/servers/{server_name}"
        self._req("DELETE", path)

    def create_user_token(
        self,
        name: str,
        *,
        scopes: list[str],
        expires_in: int = 3600,
        note: str = "psd-ui",
    ) -> dict:
        return self._req(
            "POST",
            f"/users/{name}/tokens",
            json={"scopes": scopes, "expires_in": expires_in, "note": note},
        ).json()

    def ensure_server(
        self,
        name: str,
        *,
        server_name: str = "",
        timeout_s: int = 90,
        interval: float = 1.0,
        sleep=time.sleep,
        clock=time.monotonic,
    ) -> dict:
        self.ensure_user(name)
        model = self.get_user(name)
        if server_ready(model, server_name):
            return model
        self.start_server(name, server_name)
        deadline = clock() + timeout_s
        while clock() < deadline:
            model = self.get_user(name)
            if server_ready(model, server_name):
                return model
            sleep(interval)
        raise HubError(504, f"server '{name}' tak kunjung siap ({timeout_s}s)")
