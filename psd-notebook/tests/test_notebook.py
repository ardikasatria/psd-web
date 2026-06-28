"""Uji notebook terintegrasi — kuota 5 tier kanonik."""
import json

import httpx
import pytest

from psd_notebook import jupyterlite, policy, runtime, service
from psd_notebook.kernels import KernelClient, start_kernel_gated
from psd_notebook.policy import NotebookQuotaError


def test_limits_and_create_quota():
    assert policy.limits_for("pemula").max_notebooks == 3
    assert policy.limits_for("grandmaster").max_concurrent_kernels == 4
    policy.check_can_create("pemula", 2)
    with pytest.raises(NotebookQuotaError):
        policy.check_can_create("pemula", 3)


def test_concurrent_kernel_quota():
    policy.check_can_start_kernel("ahli", 1)
    with pytest.raises(NotebookQuotaError):
        policy.check_can_start_kernel("ahli", 2)
    with pytest.raises(NotebookQuotaError):
        policy.check_can_start_kernel("pemula", 1)


def test_cpu_only():
    assert jupyterlite.browser_config("pemula", api_base="x")["gpu"] == 0


def test_runtime_browser_tier_forced_browser():
    assert runtime.choose_runtime("pemula") == "browser"
    with pytest.raises(NotebookQuotaError):
        runtime.choose_runtime("pemula", "server")


def test_runtime_both_default_and_choice():
    assert runtime.choose_runtime("ahli") == "server"
    assert runtime.choose_runtime("ahli", "browser") == "browser"
    assert runtime.choose_runtime("master", "server") == "server"


class FakeStore:
    def __init__(self, n=0):
        self._n = n
        self.created = []

    def count(self, user_id):
        return self._n

    def create(self, user_id, title):
        self._n += 1
        nb = {"id": f"nb{self._n}", "title": title}
        self.created.append(nb)
        return nb


def test_create_notebook_gated():
    store = FakeStore(n=2)
    nb = service.create_notebook(store, user_id="u", tier="pemula", title="A")
    assert nb["title"] == "A"
    with pytest.raises(NotebookQuotaError):
        service.create_notebook(store, user_id="u", tier="pemula", title="B")


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

    return KernelClient("http://jupyter:8888", "tok", transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_start_kernel_gated():
    client = kernel_client()
    k = await start_kernel_gated(client, tier="ahli", running_count=0)
    assert k["id"] == "k1"
    with pytest.raises(NotebookQuotaError):
        await start_kernel_gated(client, tier="pemula", running_count=1)


@pytest.mark.asyncio
async def test_launch_browser():
    out = await service.launch(tier="pemula", api_base="https://api.psd")
    assert out["runtime"] == "browser"
    assert out["config"]["engine"] == "jupyterlite-pyodide"


@pytest.mark.asyncio
async def test_launch_server_hub():
    out = await service.launch(tier="ahli", hub_url="https://hub.psd")
    assert out["runtime"] == "server"
    assert out["hub_url"] == "https://hub.psd"
