import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

API = "/api/v1"


@pytest.mark.asyncio
async def test_like_and_discussion_require_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        like = await ac.post(f"{API}/repos/repo_fake/like")
        assert like.status_code == 401

        disc = await ac.post(
            f"{API}/repos/repo_fake/discussions",
            json={"title": "Test", "body_md": "body", "tags": []},
        )
        assert disc.status_code == 401


@pytest.mark.asyncio
async def test_admin_requires_admin_role():
    email = f"user_{uuid.uuid4().hex[:8]}@psd.id"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg = await ac.post(
            f"{API}/auth/register",
            json={
                "username": f"u_{uuid.uuid4().hex[:6]}",
                "email": email,
                "password": "demo123",
                "name": "User",
            },
        )
        token = reg.json()["token"]
        stats = await ac.get(f"{API}/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert stats.status_code == 403
        assert stats.json()["error"]["code"] == "forbidden"
