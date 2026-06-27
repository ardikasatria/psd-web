import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

API = "/api/v1"


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_not_found_error_envelope():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"{API}/does-not-exist")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body
    assert body["error"]["code"] == "http_error"


@pytest.mark.asyncio
async def test_auth_me_requires_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"{API}/auth/me")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


@pytest.mark.asyncio
async def test_register_login_me_flow():
    email = f"test_{uuid.uuid4().hex[:8]}@psd.id"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg = await ac.post(
            f"{API}/auth/register",
            json={"username": f"user_{uuid.uuid4().hex[:6]}", "email": email, "password": "demo123", "name": "Test"},
        )
        assert reg.status_code == 200
        token = reg.json()["token"]

        login = await ac.post(f"{API}/auth/login", json={"email": email, "password": "demo123"})
        assert login.status_code == 200

        me = await ac.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["user"]["name"] == "Test"
