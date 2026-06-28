"""
Uji end-to-end (sub-langkah 3 — "konsumen percobaan").

Menjalankan seluruh mesin tanpa browser/DB asli:
  1. GET  /oauth/authorize  (klien internal → auto-consent) → ambil `code`
  2. POST /oauth/token      (code + PKCE verifier) → access/refresh/id_token
  3. Verifikasi id_token via JWKS publik (RS256)
  4. GET  /oauth/userinfo   (Bearer) → klaim cocok

Override 3 SEAM:
  - get_db           → SQLite in-memory (aiosqlite)
  - get_current_user → pengguna tetap (seolah sudah login PSD)
  - load_user_claims → di-monkeypatch (dipanggil langsung di router)

Jalankan:
    pip install pytest pytest-asyncio httpx aiosqlite sqlalchemy authlib
    pytest -q app/oauth/tests/test_oauth_flow.py
"""
import base64
import hashlib
import secrets
from urllib.parse import parse_qs, urlsplit

import pytest
import pytest_asyncio
from authlib.jose import jwt as jose_jwt
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.oauth import dependencies as deps
from app.oauth import router as router_mod
from app.oauth.dependencies import OAuthUser, get_current_user, get_db
from app.oauth.keys import get_jwks
from app.oauth.models import Base, OAuthClient
from app.oauth.router import oauth_router, wellknown_router

TEST_USER = OAuthUser(
    sub="42", name="Satria", preferred_username="satria",
    email="satria@itera.ac.id", email_verified=True, picture="https://x/p.png",
)


@pytest_asyncio.fixture
async def app_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    # seed satu klien internal (auto-consent) — "konsumen percobaan"
    async with Session() as s:
        secret = "test-secret"
        s.add(OAuthClient(
            client_id="probe", client_secret_hash=hashlib.sha256(secret.encode()).hexdigest(),
            name="Konsumen Percobaan", redirect_uris="https://probe.psd.example/callback",
            allowed_scopes="openid profile email offline_access",
            is_internal=True, is_confidential=True,
        ))
        await s.commit()

    async def _get_db():
        async with Session() as s:
            yield s

    async def _get_user(request: Request):
        return TEST_USER

    async def _load_claims(db, user_id):
        return TEST_USER if str(user_id) == TEST_USER.sub else None

    app = FastAPI()
    app.include_router(oauth_router)
    app.include_router(wellknown_router)
    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _get_user
    # load_user_claims dipanggil langsung (bukan Depends) → patch atribut modul.
    deps.load_user_claims = _load_claims
    router_mod.deps.load_user_claims = _load_claims

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, secret
    await engine.dispose()


def _pkce_pair():
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


@pytest.mark.asyncio
async def test_full_authorization_code_flow(app_client):
    client, secret = app_client
    verifier, challenge = _pkce_pair()
    redirect_uri = "https://probe.psd.example/callback"

    # 1) authorize — internal client → langsung redirect dengan code
    r = await client.get("/oauth/authorize", params={
        "response_type": "code", "client_id": "probe", "redirect_uri": redirect_uri,
        "scope": "openid profile email offline_access", "state": "xyz",
        "nonce": "n-123", "code_challenge": challenge, "code_challenge_method": "S256",
    }, follow_redirects=False)
    assert r.status_code == 302, r.text
    loc = r.headers["location"]
    qs = parse_qs(urlsplit(loc).query)
    assert qs.get("state") == ["xyz"]
    code = qs["code"][0]

    # 2) token — tukar code (client_secret_basic + PKCE verifier)
    basic = base64.b64encode(f"probe:{secret}".encode()).decode()
    r = await client.post("/oauth/token",
        data={"grant_type": "authorization_code", "code": code,
              "redirect_uri": redirect_uri, "code_verifier": verifier},
        headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 200, r.text
    tok = r.json()
    assert tok["token_type"] == "Bearer"
    assert "access_token" in tok and "refresh_token" in tok and "id_token" in tok

    # 3) verifikasi id_token via JWKS publik
    claims = jose_jwt.decode(tok["id_token"], get_jwks())
    claims.validate()
    assert claims["sub"] == "42"
    assert claims["aud"] == "probe"
    assert claims["nonce"] == "n-123"
    assert claims["email"] == "satria@itera.ac.id"

    # 4) userinfo
    r = await client.get("/oauth/userinfo",
        headers={"Authorization": f"Bearer {tok['access_token']}"})
    assert r.status_code == 200, r.text
    info = r.json()
    assert info["sub"] == "42"
    assert info["preferred_username"] == "satria"
    assert info["email_verified"] is True

    # 5) kode tidak bisa dipakai ulang
    r = await client.post("/oauth/token",
        data={"grant_type": "authorization_code", "code": code,
              "redirect_uri": redirect_uri, "code_verifier": verifier},
        headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_grant"


@pytest.mark.asyncio
async def test_refresh_token_rotates(app_client):
    client, secret = app_client
    verifier, challenge = _pkce_pair()
    redirect_uri = "https://probe.psd.example/callback"
    basic = base64.b64encode(f"probe:{secret}".encode()).decode()

    r = await client.get("/oauth/authorize", params={
        "response_type": "code", "client_id": "probe", "redirect_uri": redirect_uri,
        "scope": "openid offline_access", "code_challenge": challenge,
        "code_challenge_method": "S256",
    }, follow_redirects=False)
    code = parse_qs(urlsplit(r.headers["location"]).query)["code"][0]
    r = await client.post("/oauth/token",
        data={"grant_type": "authorization_code", "code": code,
              "redirect_uri": redirect_uri, "code_verifier": verifier},
        headers={"Authorization": f"Basic {basic}"})
    refresh = r.json()["refresh_token"]

    r = await client.post("/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": refresh},
        headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()

    # refresh lama sudah dicabut (rotasi)
    r = await client.post("/oauth/token",
        data={"grant_type": "refresh_token", "refresh_token": refresh},
        headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_unregistered_redirect_uri_rejected(app_client):
    client, _ = app_client
    r = await client.get("/oauth/authorize", params={
        "response_type": "code", "client_id": "probe",
        "redirect_uri": "https://jahat.example/cb", "scope": "openid",
    }, follow_redirects=False)
    # TIDAK redirect ke uri tak tepercaya; tampil halaman galat.
    assert r.status_code == 400
    assert "redirect_uri" in r.text


@pytest.mark.asyncio
async def test_bad_pkce_rejected(app_client):
    client, secret = app_client
    _, challenge = _pkce_pair()
    redirect_uri = "https://probe.psd.example/callback"
    basic = base64.b64encode(f"probe:{secret}".encode()).decode()
    r = await client.get("/oauth/authorize", params={
        "response_type": "code", "client_id": "probe", "redirect_uri": redirect_uri,
        "scope": "openid", "code_challenge": challenge, "code_challenge_method": "S256",
    }, follow_redirects=False)
    code = parse_qs(urlsplit(r.headers["location"]).query)["code"][0]
    r = await client.post("/oauth/token",
        data={"grant_type": "authorization_code", "code": code,
              "redirect_uri": redirect_uri, "code_verifier": "verifier-salah"},
        headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_grant"
