"""
Uji integrasi Superset (Langkah 53) dengan httpx.MockTransport — tanpa Superset hidup.

  - Klien: login → token; create_dataset payload; enable_embedded UUID; guest_token payload+RLS.
  - RLS: klausa tim aman; non-integer ditolak (anti-injeksi).
  - Endpoint guest-token: tolak 403 bila tak berhak; sertakan RLS tim bila berhak.
"""
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
    return SupersetClient("http://superset:8088", "psd_service", "pw",
                          transport=httpx.MockTransport(lambda r: base_router(r, captured)))


@pytest.mark.asyncio
async def test_login_and_create_dataset_payload():
    captured = {}
    client = mk(captured)
    out = await provisioning.promote_dashboard(
        client, gold_table="fakta_penjualan", schema="gold", database_id=1)
    await client.aclose()
    assert out == {"dataset_id": 31}
    assert captured["dataset"] == {"database": 1, "schema": "gold",
                                   "table_name": "fakta_penjualan"}


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
        client, user={"username": "budi", "first_name": "Budi", "last_name": ""},
        dashboard_uuids=["uuid-abc"], rls_clauses=rls.team_rls(7))
    await client.aclose()
    assert token == "GUEST-TOKEN"
    g = captured["guest"]
    assert g["resources"] == [{"type": "dashboard", "id": "uuid-abc"}]
    assert g["rls"] == [{"clause": "team_id = 7"}]
    assert g["user"]["username"] == "budi"


def test_rls_rejects_non_integer():
    with pytest.raises(ValueError):
        rls.team_rls("7 OR 1=1")        # injeksi → ditolak
    assert rls.team_rls(7) == [{"clause": "team_id = 7"}]
    assert rls.team_rls(7, dataset_id=31) == [{"clause": "team_id = 7", "dataset": 31}]


# ----------------- endpoint -----------------
@pytest.mark.asyncio
async def test_guest_token_endpoint(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.superset import embed_endpoint as ep
    from app.superset import seams

    monkeypatch.setattr(seams, "user_can_view_dashboard",
                        lambda u, k: k == "boleh")
    monkeypatch.setattr(seams, "embeddable_dashboard_uuid", lambda k: "uuid-abc")
    monkeypatch.setattr(seams, "user_team_id", lambda u: 7)
    monkeypatch.setattr(seams, "superset_identity",
                        lambda u: {"username": "budi", "first_name": "Budi", "last_name": ""})

    captured = {}
    app = FastAPI()
    app.include_router(ep.router)
    app.dependency_overrides[ep.get_current_user] = lambda: {"id": 1}
    app.dependency_overrides[ep.get_superset_client] = lambda: mk(captured)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        # tak berhak → 403
        r = await c.post("/api/bi/guest-token", json={"dashboard_key": "rahasia"})
        assert r.status_code == 403
        # berhak → token + RLS tim
        r = await c.post("/api/bi/guest-token", json={"dashboard_key": "boleh"})
        assert r.status_code == 200, r.text
        assert r.json()["token"] == "GUEST-TOKEN"

    assert captured["guest"]["rls"] == [{"clause": "team_id = 7"}]
