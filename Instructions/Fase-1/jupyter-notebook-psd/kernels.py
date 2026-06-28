"""
Klien kernel server (Jupyter Server / Kernel Gateway) — lifecycle via REST.

Eksekusi sel sebenarnya lewat WebSocket /api/kernels/{id}/channels (protokol pesan
Jupyter) — ditangani frontend (mis. @jupyterlab/services) atau proxy PSD. Modul ini
menangani lifecycle (start/list/interrupt/restart/shutdown) + gating kuota.

Auth Jupyter Server: header `Authorization: token <token>`.
"""
from __future__ import annotations

import httpx

from .policy import check_can_start_kernel


class KernelError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Jupyter API {status}: {body}")
        self.status = status


class KernelClient:
    def __init__(self, base_url: str, token: str, *, transport=None, client=None):
        self._c = client or httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"token {token}",
                     "Content-Type": "application/json"},
            transport=transport, timeout=30.0)

    async def aclose(self):
        await self._c.aclose()

    async def _req(self, method, url, **kw):
        r = await self._c.request(method, url, **kw)
        if r.status_code >= 400:
            raise KernelError(r.status_code, r.text)
        return r

    async def list_kernels(self) -> list:
        return (await self._req("GET", "/api/kernels")).json()

    async def start_kernel(self, name: str = "python3") -> dict:
        return (await self._req("POST", "/api/kernels", json={"name": name})).json()

    async def interrupt(self, kernel_id: str) -> None:
        await self._req("POST", f"/api/kernels/{kernel_id}/interrupt")

    async def restart(self, kernel_id: str) -> dict:
        return (await self._req("POST", f"/api/kernels/{kernel_id}/restart")).json()

    async def shutdown(self, kernel_id: str) -> None:
        await self._req("DELETE", f"/api/kernels/{kernel_id}")


async def start_kernel_gated(client: KernelClient, *, tier: str,
                             running_count: int, name: str = "python3") -> dict:
    """Mulai kernel HANYA bila di bawah batas kernel konkuren tier."""
    check_can_start_kernel(tier, running_count)
    return await client.start_kernel(name)
