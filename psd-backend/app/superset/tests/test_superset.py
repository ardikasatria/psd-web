"""Uji integrasi Superset (Langkah 53) — tanpa Superset hidup."""
import json

import httpx
import pytest

from app.superset import provisioning, rls
from app.superset.client import SupersetClient


def base_router(req: httpx.Request, captured: dict | None = None):
    p, m = req.url.path, req.method
    if m == "POST" and p == "/api/v1/security/login":
        return httpx.Response(200, json={"access_token": "JWT-ADMIN", "refresh_token": "R"})
    if m == "GET" and p == "/api/v1/security/csrf_token/":
        return httpx.Response(200, json={"result": "CSRF-1"})
    if m == "POST" and p == "/api/v1/dataset/":
        if captured is not None:
            captured["dataset"] = json.loads(req.content)
        return httpx.Response(201, json={"id": 31})
    if m == "POST" and p.startswith("/api/v1/dashboard/") and p.endswith("/embedded"):
        return httpx.Response(200, json={"result": {"uuid": "uuid-abc"}})
    if m == "POST" and p == "/api/v1/security/guest_token/":
        if captured is not None:
            captured["guest"] = json.loads(req.content)
        return httpx.Response(200, json={"token": "GUEST-TOKEN"})
    return httpx.Response(404, text=f"unrouted {m} {p}")


def mk(captured=None):
    return SupersetClient(
        "http://superset:8088",
        "psd_service",
        "pw",
        transport=httpx.MockTransport(lambda r: base_router(r, captured)),
    )


@pytest.mark.asyncio
async def test_login_and_create_dataset_payload():
    captured = {}
    client = mk(captured)
    out = await provisioning.promote_dashboard(
        client, gold_table="fakta_penjualan", schema="gold", database_id=1
    )
    await client.aclose()
    assert out == {"dataset_id": 31}
    assert captured["dataset"] == {
        "database": 1,
        "schema": "gold",
        "table_name": "fakta_penjualan",
    }


@pytest.mark.asyncio
async def test_enable_embedded_returns_uuid():
    client = mk()
    uuid = await client.enable_embedded(7, ["psd.example"])
    await client.aclose()
    assert uuid == "uuid-abc"


@pytest.mark.asyncio
async def test_guest_token_payload_has_resources_and_rls():
    captured = {}
    client = mk(captured)
    token = await provisioning.mint_guest_token(
        client,
        user={"username": "budi", "first_name": "Budi", "last_name": ""},
        dashboard_uuids=["uuid-abc"],
        rls_clauses=rls.team_rls(7),
    )
    await client.aclose()
    assert token == "GUEST-TOKEN"
    g = captured["guest"]
    assert g["resources"] == [{"type": "dashboard", "id": "uuid-abc"}]
    assert g["rls"] == [{"clause": "team_id = 7"}]
    assert g["user"]["username"] == "budi"


def test_rls_rejects_non_integer():
    with pytest.raises(ValueError):
        rls.team_rls("7 OR 1=1")
    assert rls.team_rls(7) == [{"clause": "team_id = 7"}]
    assert rls.team_rls(7, dataset_id=31) == [{"clause": "team_id = 7", "dataset": 31}]


@pytest.mark.asyncio
async def test_guest_token_endpoint(monkeypatch):
    from types import SimpleNamespace

    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.core.db import get_db
    from app.core.deps import get_current_user
    from app.superset import router as superset_router_mod
    from app.superset import seams
    from app.superset.deps import get_superset_client

    dashboard = SimpleNamespace(
        visibility="private",
        owner_id="u1",
        team_id=None,
        superset_embed_uuid="uuid-abc",
        superset_dataset_id=31,
        slug="",
    )

    async def _get_dashboard(db, slug):
        dashboard.slug = slug
        return dashboard

    async def _can_view(db, user, d):
        return d.slug == "boleh"

    async def _team_rls(db, d):
        return 7

    monkeypatch.setattr("app.superset.router.get_dashboard_by_slug", _get_dashboard)
    monkeypatch.setattr(seams, "user_can_view_dashboard", _can_view)
    monkeypatch.setattr(seams, "embeddable_dashboard_uuid", lambda d: d.superset_embed_uuid)
    monkeypatch.setattr(seams, "dashboard_team_rls_id", _team_rls)
    monkeypatch.setattr(
        seams,
        "superset_identity",
        lambda u: {"username": u.username, "first_name": "Budi", "last_name": ""},
    )

    captured = {}
    app = FastAPI()
    app.include_router(superset_router_mod.router)

    async def _user():
        return SimpleNamespace(username="budi", name="Budi")

    async def _db():
        yield None

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_db] = _db

    async def _client():
        yield mk(captured)

    app.dependency_overrides[get_superset_client] = _client

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post("/api/bi/guest-token", json={"dashboard_key": "rahasia"})
        assert r.status_code == 403
        r = await c.post("/api/bi/guest-token", json={"dashboard_key": "boleh"})
        assert r.status_code == 200, r.text
        assert r.json()["token"] == "GUEST-TOKEN"

    assert captured["guest"]["rls"] == [{"clause": "team_id = 7", "dataset": 31}]
