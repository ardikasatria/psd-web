"""
Endpoint OAuth2/OIDC PSD (Langkah 48, sub-langkah 1 & 2).

Alur: Authorization Code + PKCE, dengan lapisan OIDC (ID token + discovery + JWKS).

Endpoint:
  GET  /oauth/authorize           — mulai alur (perlu sesi login PSD)
  POST /oauth/authorize/consent   — submit layar consent (klien non-internal)
  POST /oauth/token               — tukar code / refresh token
  GET|POST /oauth/userinfo        — klaim pengguna (Bearer access token)
  GET  /oauth/jwks                — kunci publik
  GET  /.well-known/openid-configuration  — discovery
  GET  /.well-known/jwks.json     — alias JWKS

Keamanan yang ditegakkan:
- redirect_uri EXACT MATCH; error pra-validasi TIDAK redirect ke uri tak tepercaya.
- Kode otorisasi: sekali pakai, umur pendek; reuse → cabut token terkait.
- PKCE S256 diverifikasi konstan-waktu; wajib untuk klien publik.
- Auth klien: client_secret_basic / client_secret_post, banding konstan-waktu.
- Token endpoint: header no-store.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import time
from urllib.parse import quote, unquote, urlencode

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import dependencies as deps  # akses by-module agar mudah di-override/test
from .dependencies import OAuthUser, get_current_user, get_db
from .keys import get_jwks
from .models import (
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthConsent,
    OAuthToken,
)
from .scopes import SCOPES, validate_scope
from .settings import settings
from .tokens import make_id_token, new_opaque

oauth_router = APIRouter(prefix="/oauth", tags=["oauth"])
wellknown_router = APIRouter(tags=["oauth-discovery"])


# ============================ helper ============================

def _verify_pkce(verifier: str, challenge: str, method: str) -> bool:
    if method == "S256":
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
        return hmac.compare_digest(expected, challenge)
    if method == "plain":
        return hmac.compare_digest(verifier, challenge)
    return False


def _claims_dict(u: OAuthUser) -> dict:
    return {
        "sub": u.sub, "name": u.name, "preferred_username": u.preferred_username,
        "email": u.email, "email_verified": u.email_verified, "picture": u.picture,
    }


def _token_error(error: str, description: str = "", status: int = 400) -> JSONResponse:
    body = {"error": error}
    if description:
        body["error_description"] = description
    headers = {"Cache-Control": "no-store", "Pragma": "no-cache"}
    if status == 401:
        headers["WWW-Authenticate"] = "Basic"
    return JSONResponse(body, status_code=status, headers=headers)


def _error_page(error: str, description: str) -> HTMLResponse:
    # Dipakai HANYA saat redirect_uri tak tepercaya → tampilkan di halaman sendiri.
    html = (
        "<!doctype html><meta charset='utf-8'>"
        "<title>PSD — Galat Otorisasi</title>"
        "<div style='font-family:system-ui;max-width:32rem;margin:4rem auto'>"
        f"<h1 style='font-size:1.2rem'>Permintaan otorisasi ditolak</h1>"
        f"<p><b>{error}</b></p><p>{description}</p></div>"
    )
    return HTMLResponse(html, status_code=400)


def _consent_page(client: OAuthClient, scope: str, request: Request) -> HTMLResponse:
    # Stub fungsional untuk KLIEN PIHAK KETIGA. Ketiga konsumen PSD (Gitea/Hub/
    # Superset) ditandai is_internal=True sehingga MELEWATI layar ini.
    # TODO(CSRF): sisipkan token CSRF terikat sesi sebelum onboarding pihak ketiga.
    q = request.query_params
    items = "".join(
        f"<li>{SCOPES.get(s, s)}</li>" for s in scope.split()
    )
    hidden = "".join(
        f"<input type='hidden' name='{k}' value='{v}'>"
        for k, v in [
            ("client_id", q.get("client_id", "")),
            ("redirect_uri", q.get("redirect_uri", "")),
            ("scope", scope),
            ("state", q.get("state", "")),
            ("nonce", q.get("nonce", "")),
            ("code_challenge", q.get("code_challenge", "")),
            ("code_challenge_method", q.get("code_challenge_method", "")),
        ]
        if v
    )
    html = (
        "<!doctype html><meta charset='utf-8'><title>PSD — Izin Akses</title>"
        "<div style='font-family:system-ui;max-width:32rem;margin:4rem auto'>"
        f"<h1 style='font-size:1.2rem'>{client.name} ingin mengakses akun PSD Anda</h1>"
        f"<ul>{items}</ul>"
        "<form method='post' action='/oauth/authorize/consent'>"
        f"{hidden}"
        "<button name='decision' value='allow'>Izinkan</button> "
        "<button name='decision' value='deny'>Tolak</button>"
        "</form></div>"
    )
    return HTMLResponse(html)


async def _issue_code(db, client, user, redirect_uri, scope, nonce, cc, ccm) -> str:
    code = new_opaque(32)
    now = int(time.time())
    db.add(OAuthAuthorizationCode(
        code=code, client_id=client.client_id, user_id=user.sub,
        redirect_uri=redirect_uri, scope=scope, nonce=nonce,
        code_challenge=cc, code_challenge_method=(ccm if cc else None),
        auth_time=now, expires_at=now + settings.AUTHORIZATION_CODE_TTL, used=False,
    ))
    await db.commit()
    return code


async def _issue_tokens(db, client, user_id, scope, nonce, auth_time, claims) -> dict:
    now = int(time.time())
    scopes = set(scope.split())
    access = new_opaque(32)
    refresh = new_opaque(48) if "offline_access" in scopes else None
    db.add(OAuthToken(
        access_token=access, refresh_token=refresh, client_id=client.client_id,
        user_id=str(user_id), scope=scope, token_type="Bearer", issued_at=now,
        access_token_expires_at=now + settings.ACCESS_TOKEN_TTL,
        refresh_token_expires_at=(now + settings.REFRESH_TOKEN_TTL) if refresh else None,
        revoked=False,
    ))
    body = {
        "access_token": access, "token_type": "Bearer",
        "expires_in": settings.ACCESS_TOKEN_TTL, "scope": scope,
    }
    if refresh:
        body["refresh_token"] = refresh
    if "openid" in scopes:
        body["id_token"] = make_id_token(
            issuer=settings.ISSUER, client_id=client.client_id,
            user_claims=_claims_dict(claims), nonce=nonce, auth_time=auth_time,
            scope=scope, expires_in=settings.ID_TOKEN_TTL,
        )
    return body


async def _revoke_tokens_for(db, client_id: str, user_id: str) -> None:
    rows = (await db.execute(select(OAuthToken).where(
        OAuthToken.client_id == client_id, OAuthToken.user_id == str(user_id),
        OAuthToken.revoked == False,  # noqa: E712
    ))).scalars().all()
    for r in rows:
        r.revoked = True


async def _get_client(db, client_id: str | None) -> OAuthClient | None:
    if not client_id:
        return None
    return (await db.execute(
        select(OAuthClient).where(OAuthClient.client_id == client_id)
    )).scalar_one_or_none()


# ============================ /authorize ============================

@oauth_router.get("/authorize")
async def authorize(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: OAuthUser | None = Depends(get_current_user),
):
    q = request.query_params
    client = await _get_client(db, q.get("client_id"))
    redirect_uri = q.get("redirect_uri")

    # --- Galat yang TIDAK boleh redirect (redirect_uri belum tepercaya) ---
    if client is None:
        return _error_page("invalid_client", "client_id tidak dikenal.")
    if not redirect_uri or not client.check_redirect_uri(redirect_uri):
        return _error_page("invalid_redirect_uri",
                           "redirect_uri tidak terdaftar untuk klien ini.")

    state = q.get("state")
    nonce = q.get("nonce")
    code_challenge = q.get("code_challenge")
    code_challenge_method = q.get("code_challenge_method") or ("S256" if code_challenge else None)

    def redir_err(err: str, desc: str) -> RedirectResponse:
        params = {"error": err, "error_description": desc}
        if state:
            params["state"] = state
        return RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)

    if q.get("response_type") != "code":
        return redir_err("unsupported_response_type", "hanya 'code' yang didukung.")
    try:
        scope = validate_scope(q.get("scope", ""), client.scope_set())
    except ValueError as e:
        return redir_err("invalid_scope", str(e))
    if not client.is_confidential and not code_challenge:
        return redir_err("invalid_request", "PKCE wajib untuk klien publik.")
    if code_challenge and code_challenge_method not in ("S256", "plain"):
        return redir_err("invalid_request", "code_challenge_method tidak didukung.")

    # --- Belum login → lempar ke login PSD lalu kembali ke sini ---
    if user is None:
        nxt = quote(str(request.url), safe="")
        return RedirectResponse(f"{settings.LOGIN_URL}?next={nxt}", status_code=302)

    # --- Consent ---
    needs_consent = not client.is_internal
    if needs_consent:
        existing = (await db.execute(select(OAuthConsent).where(
            OAuthConsent.user_id == user.sub,
            OAuthConsent.client_id == client.client_id,
        ))).scalar_one_or_none()
        if existing and set(scope.split()).issubset(set(existing.scope.split())):
            needs_consent = False
    if needs_consent:
        return _consent_page(client, scope, request)

    code = await _issue_code(db, client, user, redirect_uri, scope,
                             nonce, code_challenge, code_challenge_method)
    params = {"code": code}
    if state:
        params["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)


@oauth_router.post("/authorize/consent")
async def authorize_consent(
    db: AsyncSession = Depends(get_db),
    user: OAuthUser | None = Depends(get_current_user),
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    scope: str = Form(...),
    decision: str = Form(...),
    state: str | None = Form(None),
    nonce: str | None = Form(None),
    code_challenge: str | None = Form(None),
    code_challenge_method: str | None = Form(None),
):
    if user is None:
        return _error_page("login_required", "Sesi tidak ditemukan.")
    client = await _get_client(db, client_id)
    if client is None or not client.check_redirect_uri(redirect_uri):
        return _error_page("invalid_client", "Permintaan tidak valid.")
    # TODO(CSRF): verifikasi token CSRF terikat sesi di sini.
    if decision != "allow":
        params = {"error": "access_denied"}
        if state:
            params["state"] = state
        return RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)
    try:
        scope = validate_scope(scope, client.scope_set())
    except ValueError as e:
        params = {"error": "invalid_scope", "error_description": str(e)}
        if state:
            params["state"] = state
        return RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)

    db.add(OAuthConsent(user_id=user.sub, client_id=client.client_id,
                        scope=scope, granted_at=int(time.time())))
    await db.commit()
    code = await _issue_code(db, client, user, redirect_uri, scope,
                             nonce, code_challenge, code_challenge_method)
    params = {"code": code}
    if state:
        params["state"] = state
    return RedirectResponse(f"{redirect_uri}?{urlencode(params)}", status_code=302)


# ============================ /token ============================

async def _authenticate_client(request: Request, form, db):
    """Auth klien via Basic header atau body. Return (client, error_response)."""
    cid = secret = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("basic "):
        try:
            raw = base64.b64decode(auth.split(" ", 1)[1]).decode("utf-8")
            cid, _, secret = raw.partition(":")
            cid, secret = unquote(cid), unquote(secret)
        except Exception:
            return None, _token_error("invalid_client", "header Basic rusak.", 401)
    if cid is None:
        cid = form.get("client_id")
        secret = form.get("client_secret")
    client = await _get_client(db, cid)
    if client is None:
        return None, _token_error("invalid_client", "klien tidak dikenal.", 401)
    if client.is_confidential:
        if not secret:
            return None, _token_error("invalid_client", "secret diperlukan.", 401)
        h = hashlib.sha256(secret.encode("utf-8")).hexdigest()
        if not hmac.compare_digest(h, client.client_secret_hash or ""):
            return None, _token_error("invalid_client", "secret salah.", 401)
    return client, None


@oauth_router.post("/token")
async def token(request: Request, db: AsyncSession = Depends(get_db)):
    form = await request.form()
    client, err = await _authenticate_client(request, form, db)
    if err:
        return err
    grant_type = form.get("grant_type")
    if grant_type == "authorization_code":
        return await _grant_auth_code(form, client, db)
    if grant_type == "refresh_token":
        return await _grant_refresh(form, client, db)
    return _token_error("unsupported_grant_type",
                        "gunakan authorization_code atau refresh_token.", 400)


async def _grant_auth_code(form, client, db):
    code = form.get("code")
    redirect_uri = form.get("redirect_uri")
    verifier = form.get("code_verifier")

    row = (await db.execute(select(OAuthAuthorizationCode).where(
        OAuthAuthorizationCode.code == code
    ))).scalar_one_or_none()

    if row is None or row.client_id != client.client_id:
        return _token_error("invalid_grant", "kode tidak valid.")
    if row.used:
        # Reuse kode = sinyal pencurian → cabut token terkait.
        await _revoke_tokens_for(db, client.client_id, row.user_id)
        await db.commit()
        return _token_error("invalid_grant", "kode sudah dipakai.")
    if row.is_expired():
        return _token_error("invalid_grant", "kode kedaluwarsa.")
    if row.redirect_uri != redirect_uri:
        return _token_error("invalid_grant", "redirect_uri tidak cocok.")
    if row.code_challenge:
        if not verifier or not _verify_pkce(
            verifier, row.code_challenge, row.code_challenge_method or "plain"
        ):
            return _token_error("invalid_grant", "verifikasi PKCE gagal.")

    row.used = True
    await db.flush()

    claims = await deps.load_user_claims(db, row.user_id)
    if claims is None:
        return _token_error("invalid_grant", "pengguna tidak ditemukan.")

    body = await _issue_tokens(db, client, row.user_id, row.scope,
                               nonce=row.nonce, auth_time=row.auth_time, claims=claims)
    await db.commit()
    return JSONResponse(body, headers={"Cache-Control": "no-store", "Pragma": "no-cache"})


async def _grant_refresh(form, client, db):
    rt = form.get("refresh_token")
    row = (await db.execute(select(OAuthToken).where(
        OAuthToken.refresh_token == rt
    ))).scalar_one_or_none()
    if row is None or row.client_id != client.client_id or row.revoked:
        return _token_error("invalid_grant", "refresh token tidak valid.")
    if row.refresh_token_expires_at and time.time() > row.refresh_token_expires_at:
        return _token_error("invalid_grant", "refresh token kedaluwarsa.")

    scope = row.scope
    req_scope = form.get("scope")
    if req_scope:
        if not set(req_scope.split()).issubset(set(row.scope.split())):
            return _token_error("invalid_scope", "scope melebihi pemberian awal.")
        scope = req_scope

    row.revoked = True  # rotasi: refresh lama mati
    claims = await deps.load_user_claims(db, row.user_id)
    if claims is None:
        return _token_error("invalid_grant", "pengguna tidak ditemukan.")
    body = await _issue_tokens(db, client, row.user_id, scope,
                               nonce=None, auth_time=int(time.time()), claims=claims)
    await db.commit()
    return JSONResponse(body, headers={"Cache-Control": "no-store", "Pragma": "no-cache"})


# ============================ /userinfo ============================

@oauth_router.get("/userinfo")
@oauth_router.post("/userinfo")
async def userinfo(request: Request, db: AsyncSession = Depends(get_db)):
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return JSONResponse({"error": "invalid_token"}, status_code=401,
                            headers={"WWW-Authenticate": "Bearer"})
    at = auth.split(" ", 1)[1].strip()
    row = (await db.execute(select(OAuthToken).where(
        OAuthToken.access_token == at
    ))).scalar_one_or_none()
    if row is None or row.revoked or row.access_expired():
        return JSONResponse(
            {"error": "invalid_token"}, status_code=401,
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    claims = await deps.load_user_claims(db, row.user_id)
    if claims is None:
        return JSONResponse({"error": "invalid_token"}, status_code=401)

    scopes = set(row.scope.split())
    out: dict = {"sub": str(claims.sub)}
    if "profile" in scopes:
        if claims.name:
            out["name"] = claims.name
        if claims.preferred_username:
            out["preferred_username"] = claims.preferred_username
        if claims.picture:
            out["picture"] = claims.picture
    if "email" in scopes and claims.email:
        out["email"] = claims.email
        out["email_verified"] = bool(claims.email_verified)
    return JSONResponse(out)


# ============================ discovery + jwks ============================

@wellknown_router.get("/.well-known/openid-configuration")
async def discovery():
    i = settings.ISSUER
    return JSONResponse({
        "issuer": i,
        "authorization_endpoint": f"{i}/oauth/authorize",
        "token_endpoint": f"{i}/oauth/token",
        "userinfo_endpoint": f"{i}/oauth/userinfo",
        "jwks_uri": f"{i}/oauth/jwks",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "scopes_supported": list(SCOPES.keys()),
        "token_endpoint_auth_methods_supported": [
            "client_secret_basic", "client_secret_post",
        ],
        "code_challenge_methods_supported": ["S256", "plain"],
        "claims_supported": [
            "sub", "name", "preferred_username", "picture",
            "email", "email_verified", "auth_time", "nonce",
        ],
    })


@oauth_router.get("/jwks")
@wellknown_router.get("/.well-known/jwks.json")
async def jwks():
    return JSONResponse(get_jwks())
