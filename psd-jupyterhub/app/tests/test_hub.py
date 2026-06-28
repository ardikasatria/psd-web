"""
Uji logika inti Langkah 52 — tanpa JupyterHub/Docker hidup.
"""
import os
from types import SimpleNamespace

import httpx
import pytest

from app.hubtools import spawn, tiers


def test_resolve_known_and_default():
    assert tiers.resolve_limits("lanjut").cpu == 4.0
    assert tiers.resolve_limits("LANJUT").mem_gb == 8
    assert tiers.resolve_limits(None).cpu == tiers.TIERS["pemula"].cpu
    assert tiers.resolve_limits("tak-ada") == tiers.TIERS["pemula"]


def test_cpu_only_no_gpu():
    for lim in tiers.TIERS.values():
        assert lim.gpu == 0


@pytest.mark.asyncio
async def test_apply_tier_limits_sets_limits_and_env(monkeypatch):
    monkeypatch.setenv("PSD_API_BASE", "http://psd.local")
    spawner = SimpleNamespace(environment={})

    await spawn.auth_state_hook(
        spawner,
        {
            "access_token": "AT-123",
            "oauth_user": {"preferred_username": "budi", "psd_tier": "lanjut"},
        },
    )
    lim = await spawn.apply_tier_limits(spawner)

    assert spawner.cpu_limit == 4.0
    assert spawner.mem_limit == "8G"
    assert spawner.start_timeout == 300
    assert spawner.environment["PSD_TOKEN"] == "AT-123"
    assert spawner.environment["PSD_TIER"] == "lanjut"
    assert spawner.environment["PSD_API_BASE"] == "http://psd.local"
    assert spawner._psd_max_lifetime == 6 * 3600
    assert not hasattr(spawner, "gpu")
    assert lim.gpu == 0


@pytest.mark.asyncio
async def test_apply_tier_limits_defaults_when_no_tier(monkeypatch):
    monkeypatch.setenv("PSD_API_BASE", "http://psd.local")
    spawner = SimpleNamespace(environment={})
    await spawn.auth_state_hook(spawner, {"access_token": "x", "oauth_user": {}})
    await spawn.apply_tier_limits(spawner)
    assert spawner.mem_limit == "2G"
    assert spawner.environment["PSD_TIER"] == "pemula"


def test_parse_uri():
    from app import psd_sdk

    assert psd_sdk.parse_uri("psd://budi/iris/data/iris.csv") == ("budi", "iris", "data/iris.csv")
    with pytest.raises(ValueError):
        psd_sdk.parse_uri("http://x/y/z")
    with pytest.raises(ValueError):
        psd_sdk.parse_uri("psd://budi/iris")


def test_resolver_request_shape():
    from app import psd_sdk

    seen = {}

    def handler(req: httpx.Request):
        seen["path"] = req.url.path
        seen["q"] = dict(req.url.params)
        seen["auth"] = req.headers.get("authorization")
        return httpx.Response(200, json={"presigned_url": "http://minio.local/iris.csv?sig=1"})

    http = httpx.Client(transport=httpx.MockTransport(handler))
    r = psd_sdk.Resolver(api_base="http://psd.local", token="AT", http=http)
    meta = r.resolve("psd://budi/iris/iris.csv")
    assert seen["path"] == "/api/datasets/budi/iris/resolve"
    assert seen["q"]["path"] == "iris.csv"
    assert seen["auth"] == "Bearer AT"
    assert meta["presigned_url"].startswith("http://minio.local/")


def test_download_writes_content(tmp_path):
    from app import psd_sdk

    def handler(req: httpx.Request):
        if req.url.path.endswith("/resolve"):
            return httpx.Response(200, json={"presigned_url": "http://minio.local/iris.csv?sig=1"})
        return httpx.Response(200, content=b"a,b\n1,2\n")

    http = httpx.Client(transport=httpx.MockTransport(handler))
    r = psd_sdk.Resolver(api_base="http://psd.local", token="AT", http=http)
    dest = os.path.join(tmp_path, "iris.csv")
    out = psd_sdk.download("psd://budi/iris/iris.csv", dest, resolver=r)
    assert out == dest
    assert open(dest, "rb").read() == b"a,b\n1,2\n"
