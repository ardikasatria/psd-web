"""Uji integrasi JupyterHub."""
import json

import httpx
import pytest

from app.hub import hub_urls, launch
from app.hub.hub_client import HubError, JupyterHubClient
from app.hub.launch import HubAccessError


# -------------------- URL & scope --------------------
def test_urls_and_scope():
    base = hub_urls.user_server_base("https://hub.psd.example/", "budi")
    assert base == "https://hub.psd.example/user/budi"
    assert hub_urls.kernels_url(base) == "https://hub.psd.example/user/budi/api/kernels"
    assert hub_urls.ws_channels_url(base, "k1") == "wss://hub.psd.example/user/budi/api/kernels/k1/channels"
    assert hub_urls.access_scope("budi") == "access:servers!user=budi"
    assert hub_urls.to_ws_url("http://x/y") == "ws://x/y"


def test_server_ready_variants():
    assert hub_urls.server_ready({"servers": {"": {"ready": True}}}) is True
    assert hub_urls.server_ready({"servers": {"": {"ready": False}}}) is False
    assert hub_urls.server_ready({"server": "/user/b/", "pending": None}) is True
    assert hub_urls.server_ready({"server": None, "pending": "spawn"}) is False


# -------------------- klien Hub --------------------
def make_client(handler):
    return JupyterHubClient("https://hub.psd.example/hub/api", "svc-token",
                            transport=httpx.MockTransport(handler))


def test_start_and_token_request_shaping():
    seen = {}

    def handler(req: httpx.Request):
        seen[(req.method, req.url.path)] = json.loads(req.content) if req.content else None
        seen["auth"] = req.headers.get("authorization")
        if req.method == "POST" and req.url.path.endswith("/server"):
            return httpx.Response(202)
        if req.method == "POST" and req.url.path.endswith("/tokens"):
            return httpx.Response(201, json={"token": "scoped-abc"})
        return httpx.Response(404)

    c = make_client(handler)
    assert c.start_server("budi") == 202
    tok = c.create_user_token("budi", scopes=["access:servers!user=budi"], expires_in=600)
    assert tok["token"] == "scoped-abc"
    assert seen["auth"] == "token svc-token"
    assert seen[("POST", "/hub/api/users/budi/tokens")]["expires_in"] == 600


def test_ensure_server_polls_until_ready():
    calls = {"n": 0}

    def handler(req: httpx.Request):
        if req.method == "POST":
            return httpx.Response(202)
        # GET users/budi: pending dulu, lalu ready
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(200, json={"servers": {"": {"ready": False}}, "pending": "spawn"})
        return httpx.Response(200, json={"servers": {"": {"ready": True}}})

    c = make_client(handler)
    model = c.ensure_server("budi", timeout_s=10, interval=0, sleep=lambda s: None,
                            clock=lambda: 0.0)
    assert hub_urls.server_ready(model) is True


def test_ensure_server_timeout():
    def handler(req: httpx.Request):
        if req.method == "POST":
            return httpx.Response(202)
        return httpx.Response(200, json={"servers": {"": {"ready": False}}, "pending": "spawn"})

    c = make_client(handler)
    t = [0.0]
    with pytest.raises(HubError) as e:
        c.ensure_server("budi", timeout_s=5, interval=1, sleep=lambda s: None,
                        clock=lambda: t.__setitem__(0, t[0] + 3) or t[0])
    assert e.value.status == 504


# -------------------- launch --------------------
class FakeHub:
    def __init__(self): self.ensured = []
    def ensure_server(self, name, server_name=""): self.ensured.append(name)
    def create_user_token(self, name, *, scopes, expires_in, note="psd-ui"):
        self.scopes = scopes
        return {"token": "scoped-xyz"}


def test_open_runtime_returns_config_when_allowed():
    hub = FakeHub()
    cfg = launch.open_server_runtime(hub, name="budi", hub_public_url="https://hub.psd.example",
                                     grant_active=True, running_count=0, max_concurrent=2)
    assert cfg["provider"] == "jupyterhub"
    assert cfg["base_url"] == "https://hub.psd.example/user/budi"
    assert cfg["ws_base"] == "wss://hub.psd.example/user/budi"
    assert cfg["token"] == "scoped-xyz"
    assert hub.scopes == ["access:servers!user=budi"]
    assert hub.ensured == ["budi"]


def test_open_runtime_blocks_without_grant_or_over_limit():
    hub = FakeHub()
    with pytest.raises(HubAccessError) as e1:
        launch.open_server_runtime(hub, name="b", hub_public_url="https://h",
                                   grant_active=False, running_count=0, max_concurrent=2)
    assert e1.value.status == 403
    with pytest.raises(HubAccessError) as e2:
        launch.open_server_runtime(hub, name="b", hub_public_url="https://h",
                                   grant_active=True, running_count=2, max_concurrent=2)
    assert e2.value.status == 429
