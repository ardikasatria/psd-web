"""
Uji notebook terintegrasi (revisi Langkah 52) — murni Python + httpx.MockTransport.
"""
import json

import httpx
import pytest

from app.notebook import jupyterlite, policy, runtime, service
from app.notebook.kernels import KernelClient, start_kernel_gated
from app.notebook.policy import NotebookQuotaError


# -------------------- kuota tier --------------------
def test_limits_and_create_quota():
    assert policy.limits_for("pemula").max_notebooks == 3
    assert policy.limits_for("lanjut").max_concurrent_kernels == 4
    policy.check_can_create("pemula", 2)            # masih boleh (2<3)
    with pytest.raises(NotebookQuotaError):
        policy.check_can_create("pemula", 3)        # penuh


def test_concurrent_kernel_quota():
    policy.check_can_start_kernel("menengah", 1)    # 1<2 ok
    with pytest.raises(NotebookQuotaError):
        policy.check_can_start_kernel("menengah", 2)
    with pytest.raises(NotebookQuotaError):
        policy.check_can_start_kernel("pemula", 1)  # pemula maks 1


def test_cpu_only():
    assert jupyterlite.browser_config("pemula", api_base="x")["gpu"] == 0


# -------------------- runtime hybrid --------------------
def test_runtime_browser_tier_forced_browser():
    assert runtime.choose_runtime("pemula") == "browser"
    with pytest.raises(NotebookQuotaError):
        runtime.choose_runtime("pemula", "server")  # belum berhak server


def test_runtime_both_default_and_choice():
    assert runtime.choose_runtime("menengah") == "server"          # default server
    assert runtime.choose_runtime("menengah", "browser") == "browser"
    assert runtime.choose_runtime("lanjut", "server") == "server"


# -------------------- CRUD gated --------------------
class FakeStore:
    def __init__(self, n=0): self._n = n; self.created = []
    def count(self, user_id): return self._n
    def create(self, user_id, title):
        self._n += 1; nb = {"id": f"nb{self._n}", "title": title}
        self.created.append(nb); return nb


def test_create_notebook_gated():
    store = FakeStore(n=2)
    nb = service.create_notebook(store, user_id="u", tier="pemula", title="A")  # 2→3 ok
    assert nb["title"] == "A"
    with pytest.raises(NotebookQuotaError):
        service.create_notebook(store, user_id="u", tier="pemula", title="B")   # 3 penuh


# -------------------- klien kernel --------------------
def kernel_client(capture=None):
    def handler(req: httpx.Request):
        p, m = req.url.path, req.method
        if m == "POST" and p == "/api/kernels":
            if capture is not None:
                capture["start"] = json.loads(req.content)
            return httpx.Response(201, json={"id": "k1", "name": "python3"})
        if m == "GET" and p == "/api/kernels":
            return httpx.Response(200, json=[{"id": "k1"}])
        if m == "DELETE" and p == "/api/kernels/k1":
            return httpx.Response(204)
        return httpx.Response(404, text=f"{m} {p}")
    return KernelClient("http://jupyter:8888", "tok",
                        transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_kernel_start_and_shutdown():
    cap = {}
    c = kernel_client(cap)
    k = await c.start_kernel("python3")
    assert k["id"] == "k1" and cap["start"]["name"] == "python3"
    await c.shutdown("k1")
    await c.aclose()


@pytest.mark.asyncio
async def test_start_kernel_gated_blocks_over_limit():
    c = kernel_client()
    k = await start_kernel_gated(c, tier="menengah", running_count=1)   # 1<2 ok
    assert k["id"] == "k1"
    with pytest.raises(NotebookQuotaError):
        await start_kernel_gated(c, tier="menengah", running_count=2)
    await c.aclose()


# -------------------- launch orchestration --------------------
@pytest.mark.asyncio
async def test_launch_browser_for_low_tier():
    out = await service.launch(tier="pemula", api_base="https://psd.example")
    assert out["runtime"] == "browser"
    assert out["config"]["engine"] == "jupyterlite-pyodide"
    assert "pandas" in out["config"]["packages"]


@pytest.mark.asyncio
async def test_launch_server_for_higher_tier():
    c = kernel_client()
    out = await service.launch(tier="lanjut", requested_runtime="server",
                               client=c, running_kernels=0)
    assert out["runtime"] == "server" and out["kernel_id"] == "k1"
    assert out["limits"]["cpu"] == 4
    await c.aclose()


@pytest.mark.asyncio
async def test_launch_server_blocked_when_at_limit():
    c = kernel_client()
    with pytest.raises(NotebookQuotaError):
        await service.launch(tier="menengah", requested_runtime="server",
                             client=c, running_kernels=2)
    await c.aclose()
