"""Uji hub tier mapping & dataset resolve (Langkah 52)."""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.db import Base
from app.core.security import create_access_token
from app.hub.tiers import hub_tier_for_reputation
from app.main import app
from app.modules.repos.models import Repo
from app.modules.users.models import User


@pytest_asyncio.fixture
async def client(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as s:
        owner = User(
            id="usr_owner1",
            username="budi",
            email="budi@test.id",
            name="Budi",
            hashed_password="x",
            reputation=300,
        )
        viewer = User(
            id="usr_view1",
            username="ani",
            email="ani@test.id",
            name="Ani",
            hashed_password="x",
            reputation=10,
        )
        s.add_all([owner, viewer])
        s.add(
            Repo(
                id="repo_ds1",
                kind="dataset",
                owner_id=owner.id,
                name="iris",
                slug="budi/iris",
                description="Iris",
                files=[
                    {
                        "path": "iris.csv",
                        "path_key": "repos/repo_ds1/iris.csv",
                        "size_bytes": 100,
                        "type": "text/csv",
                    }
                ],
            )
        )
        await s.commit()

    from app.core import db as db_mod

    async def _get_db():
        async with Session() as s:
            yield s

    app.dependency_overrides[db_mod.get_db] = _get_db
    monkeypatch.setattr(
        "app.hub.resolve.presigned_asset_get",
        lambda key, expires=900: f"http://minio.test/{key}?sig=1",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, viewer
    app.dependency_overrides.clear()
    await engine.dispose()


def test_hub_tier_mapping():
    assert hub_tier_for_reputation(0) == "pemula"
    assert hub_tier_for_reputation(50) == "pemula"
    assert hub_tier_for_reputation(250) == "menengah"
    assert hub_tier_for_reputation(5000) == "lanjut"


@pytest.mark.asyncio
async def test_resolve_dataset_jwt(client):
    c, viewer = client
    token = create_access_token(viewer.id)
    r = await c.get(
        "/api/datasets/budi/iris/resolve",
        params={"path": "iris.csv"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["presigned_url"].startswith("http://minio.test/")
    assert body["content_type"] == "text/csv"


@pytest.mark.asyncio
async def test_resolve_dataset_missing_file(client):
    c, viewer = client
    token = create_access_token(viewer.id)
    r = await c.get(
        "/api/datasets/budi/iris/resolve",
        params={"path": "missing.csv"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404
