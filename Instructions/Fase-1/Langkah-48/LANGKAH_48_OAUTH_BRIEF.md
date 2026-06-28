# Brief Agen Cursor — Langkah 48: OAuth/OIDC Provider PSD

> **Cara pakai:** lampirkan file ini ke agen Cursor di repo PSD, lalu mulai dengan:
> *"Kerjakan Langkah 48 sesuai brief terlampir. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuanmu, dan tanyakan hal yang ambigu SEBELUM menulis kode."*
>
> Brief ini **bukan** kode untuk ditempel mentah. Ini spesifikasi yang harus kamu (agen)
> sesuaikan ke kode PSD yang sudah ada (auth Langkah 14, model `User`, sesi DB, struktur FastAPI).
> Tersedia **scaffold referensi yang sudah lulus uji** di `psd-oauth/app/oauth/` — gunakan sebagai
> cermin desain, **bukan** untuk disalin apa adanya (ia memakai `Base` & stub sendiri).

---

## 1. Tujuan & mengapa ini fondasi

Jadikan PSD sebagai **OpenID Connect (OIDC) Provider** — satu login untuk Gitea (Langkah 50),
JupyterHub (52), dan Superset (53). Ini **prasyarat mengikat**: bila ketiga layanan dibangun tanpa
provider identitas tunggal, mereka jadi tiga sistem login terpisah yang nanti harus dibongkar.

Hasil akhir Langkah 48: pengguna yang sudah login di PSD (cookie httpOnly Langkah 14) bisa
mengotorisasi klien internal, klien menukar `code` jadi token, dan memverifikasi identitas via
`userinfo` / `id_token`.

---

## 2. Keputusan desain (sudah dikunci — jangan diubah tanpa alasan kuat)

1. **OIDC, bukan OAuth2 polos.** Authorization Code + **PKCE**, plus lapisan OIDC:
   `id_token` (JWT **RS256**), discovery `/.well-known/openid-configuration`, dan JWKS.
   Alasan: Gitea/JupyterHub/Superset semuanya bisa pakai *discovery* → konfigurasi minimal.
2. **Access token = opaque & dapat dicabut** (disimpan server-side, dicek saat `userinfo`).
   **`id_token` = JWT** bertanda tangan. Jangan buat access token sebagai JWT (agar bisa revoke).
3. **Jangan gulung kripto sendiri.** Pakai pustaka untuk JWS/JWK. Randomness via `secrets`,
   banding rahasia/PKCE via `hmac.compare_digest`.
4. **3 seam integrasi** ke kode PSD eksisting (lihat §5). Ini satu-satunya yang menyentuh kode lama.
5. **`redirect_uri` EXACT MATCH.** Tidak ada wildcard/prefix.
6. **Klien internal (Gitea/Hub/Superset) auto-consent**; layar consent hanya untuk pihak ketiga.

---

## 3. Langkah 0 — Orientasi repo (WAJIB sebelum menulis kode)

Telусуri repo dan **laporkan** temuan berikut. Bila ada yang tidak ketemu / ambigu → **berhenti & tanya**.

- [ ] Entrypoint FastAPI & cara router didaftarkan (`app.include_router(...)` di mana?).
- [ ] Pola sesi DB: `AsyncSession`? `async_sessionmaker`? Sync `Session`? Nama dependency `get_db`/`get_session`?
- [ ] ORM: SQLAlchemy 2.0 (`Mapped`/`mapped_column`)? SQLModel? Tortoise? Lain?
- [ ] `Base` deklaratif bersama (untuk metadata migrasi) — di modul mana?
- [ ] Model `User`: nama field untuk **id stabil**, `username`, `email`, status verifikasi email,
      nama lengkap, URL avatar. (Catat nama persis tiap field.)
- [ ] **Mekanisme Langkah 14**: nama cookie sesi, cara *current user* diresolusi
      (middleware yang isi `request.state.user`? dependency `get_current_user`?). Catat persis.
- [ ] Pola konfigurasi/env (pydantic `Settings`? `os.environ`? file `config.py`?).
- [ ] Alat migrasi (Alembic? lainnya?) & lokasi folder migrasi.
- [ ] Pustaka JOSE yang sudah ada di proyek (lihat §9 — `authlib.jose` vs `joserfc`).

**Pertanyaan yang umumnya perlu dijawab manusia:**
1. Apakah memakai **`Base` bersama** (satu metadata) atau **metadata terpisah** untuk tabel `oauth_*`?
2. `sub` OIDC harus stabil selamanya — pakai `str(User.id)`? (Jangan email/username bila bisa berubah.)
3. Domain produksi tiap layanan (untuk `redirect_uri` Gitea/Hub/Superset).

---

## 4. Sub-langkah (sesuai roadmap)

### Sub-langkah 1 — Endpoint OAuth2 + registrasi klien internal
Buat modul `app/oauth/` (sesuaikan path ke struktur PSD), berisi:

- **`models.py`** — tabel: `oauth_clients`, `oauth_authorization_codes`, `oauth_tokens`, `oauth_consents`.
  Gunakan `Base` & gaya ORM PSD (hasil Langkah 0). Field kunci:
  - client: `client_id` (unik), `client_secret_hash` (sha256 hex; kosong utk klien publik),
    `name`, `redirect_uris` (newline-sep, exact match), `allowed_scopes` (space-sep),
    `is_internal` (skip consent), `is_confidential`.
  - code: `code` (unik), `client_id`, `user_id`, `redirect_uri`, `scope`, `nonce`,
    `code_challenge`, `code_challenge_method`, `auth_time`, `expires_at`, `used`.
  - token: `access_token` (unik), `refresh_token` (unik, nullable), `client_id`, `user_id`,
    `scope`, `token_type`, `issued_at`, `access_token_expires_at`, `refresh_token_expires_at`, `revoked`.
  - consent: `user_id`, `client_id`, `scope`, `granted_at`.
- **`settings.py`** — `ISSUER` (https, tanpa trailing slash), TTL (code 60dtk, access 1jam,
  refresh 30hari, id 1jam), `LOGIN_URL` (login PSD Langkah 14), `KEY_ID`.
- **`keys.py`** — muat RSA private key dari env (`PSD_OIDC_PRIVATE_KEY` PEM), fallback ephemeral utk dev;
  ekspor `get_jwks()` (kunci publik) & `get_kid()`.
- **`tokens.py`** — `new_opaque()` (token acak) & `make_id_token(...)` (JWT RS256: `iss/sub/aud/iat/exp/auth_time`,
  `nonce` bila ada, klaim `profile`/`email` sesuai scope).
- **`scopes.py`** — definisi scope + `validate_scope()`. Aktif Langkah 48: `openid profile email offline_access`.
  Daftarkan `repo:read/repo:write/dataset:read` (belum aktif; baru bermakna di Langkah 50/dataset).
- **`router.py`** — endpoint:
  `GET /oauth/authorize`, `POST /oauth/authorize/consent`, `POST /oauth/token`,
  `GET|POST /oauth/userinfo`, `GET /oauth/jwks`,
  `GET /.well-known/openid-configuration`, `GET /.well-known/jwks.json`.

**Modifikasi kode lama:** daftarkan kedua router (`oauth_router` prefix `/oauth`, `wellknown_router`
tanpa prefix) di app; tambah variabel env; buat **migrasi** (autogenerate Alembic) untuk 4 tabel.

### Sub-langkah 2 — Consent & scope
- Klien `is_internal=True` → **auto-consent** (Gitea/Hub/Superset).
- Klien pihak ketiga → tampilkan layar consent + simpan `OAuthConsent` agar tak diminta ulang.
  Stub HTML fungsional cukup untuk sekarang; **beri TODO CSRF** terikat sesi sebelum onboarding pihak ketiga.

### Sub-langkah 3 — Uji konsumen percobaan
Tambahkan uji end-to-end (cermin `psd-oauth/app/oauth/tests/test_oauth_flow.py`) yang **harus lulus**:
authorize (internal→auto-consent) → token (code+PKCE) → verifikasi `id_token` via JWKS → `userinfo`,
plus kasus negatif: reuse code ditolak, PKCE salah ditolak, `redirect_uri` tak terdaftar ditolak,
rotasi refresh token. Override 3 seam dengan SQLite in-memory + user dummy.

---

## 5. Tiga seam integrasi (bagian paling kritis)

| Seam | Fungsi | Tugas agen |
|---|---|---|
| **DB** | `get_db()` | Pakai dependency sesi PSD yang sudah ada — **jangan** bikin engine baru. |
| **User login** | `get_current_user(request) -> OAuthUser \| None` | Resolusi dari mekanisme Langkah 14 (cookie/middleware/dependency). Dipakai `/authorize`. Bila `None` → redirect ke `LOGIN_URL?next=<authorize url>`. |
| **Klaim by id** | `load_user_claims(db, user_id) -> OAuthUser \| None` | Ambil user by id (tanpa cookie). Dipakai `/token` & `/userinfo`. |

`OAuthUser` = dataclass minimal: `sub, name, preferred_username, email, email_verified, picture`.
**`sub` wajib stabil & unik** seumur hidup akun.

---

## 6. Daftar periksa keamanan (Definition of Done)

- [ ] `redirect_uri` exact match; galat **pra-validasi** (client/redirect tak valid) **tidak** redirect ke uri tak tepercaya — tampil halaman galat sendiri.
- [ ] Authorization code: **sekali pakai**, TTL pendek (≤60dtk); **reuse → cabut** token terkait.
- [ ] PKCE **S256** diverifikasi konstan-waktu; **wajib** untuk klien publik.
- [ ] Auth klien: `client_secret_basic` + `client_secret_post`; banding hash **konstan-waktu**; secret **hanya** disimpan ter-hash.
- [ ] `id_token` RS256 berisi `iss/sub/aud/iat/exp/auth_time` (+`nonce` bila diminta); JWKS expose kunci publik dengan `kid`.
- [ ] Access token opaque dapat dicabut; `userinfo` tolak token revoked/kedaluwarsa (401 + `WWW-Authenticate`).
- [ ] Refresh token **dirotasi** (yang lama mati saat dipakai).
- [ ] Endpoint `/token` & `userinfo` kirim header `Cache-Control: no-store`.
- [ ] Secret klien internal di-print **sekali** saat seeding; tak pernah plaintext di DB.
- [ ] Uji end-to-end + kasus negatif **hijau**.

---

## 7. Yang TIDAK dikerjakan di Langkah 48 (non-goals)

- Wiring **nyata** Gitea/JupyterHub/Superset → itu Langkah 50/52/53 (lihat §8 sebagai catatan ke depan).
- Otomasi **rotasi kunci** RSA (cukup 1 kunci aktif + `kid` dulu).
- UI consent pihak ketiga yang dipoles + CSRF penuh (stub + TODO cukup; semua konsumen kini internal).
- Token introspection/revocation endpoint RFC 7009/7662 (boleh menyusul bila perlu).

---

## 8. Catatan konfigurasi konsumen (untuk Langkah 50/52/53, bukan sekarang)

| Layanan | Cara sambung | Catatan |
|---|---|---|
| **Gitea** | Authentication Source → OAuth2 → **OpenID Connect**, Auto Discovery URL = `<ISSUER>/.well-known/openid-configuration` | callback: `<gitea>/user/oauth2/<NamaSumber>/callback`; scope `openid profile email` |
| **JupyterHub** | `GenericOAuthenticator`: `authorize_url`, `token_url`, `userdata_url` (userinfo), `oauth_callback_url`, `username_claim='preferred_username'` | scope `openid profile email`; CPU-only sesuai strategi |
| **Superset** | FAB `OAUTH_PROVIDERS` provider kustom `psd` + `get_user_info` panggil `userinfo`, map `sub`→username | callback: `<superset>/oauth-authorized/psd` |

Seed klien internal: cermin `psd-oauth/app/oauth/seed_clients.py` (`python -m app.oauth.seed_clients`),
ganti domain placeholder ke domain produksi.

---

## 9. Gotcha (dari verifikasi scaffold referensi)

- **`authlib.jose` sudah deprecated** (akan diganti `joserfc` sebelum authlib 2.0). Pilih satu:
  tetap `authlib.jose` untuk sekarang (jalan di authlib 1.7.x), **atau** langsung pakai `joserfc`.
  Putuskan sesuai pustaka yang sudah ada di repo; jangan campur dua-duanya.
- **`python-multipart` wajib** untuk endpoint `Form(...)` (consent & `/token`). Tambah ke dependency.
- `JsonWebKey.generate_key("RSA", 2048, {kid,...}, is_private=True)` & `key.as_dict(is_private=False)`
  → bentuk JWKS. Verifikasi API ini terhadap versi pustaka terpasang.
- `make_id_token` mengembalikan `bytes` di sebagian versi → `.decode()` bila perlu.
- Untuk SQLAlchemy 2.0 async: `select(...).where(...)` + `(await db.execute(stmt)).scalar_one_or_none()`.

---

## 10. Referensi terverifikasi

Scaffold di `psd-oauth/app/oauth/` **lulus 4 uji** (alur penuh, rotasi refresh, tolak redirect tak terdaftar,
tolak PKCE salah) pada authlib 1.7.2 + SQLAlchemy 2.0.51. Pakai sebagai cermin desain; sesuaikan
`models.Base`, `get_db`, `get_current_user`, `load_user_claims` ke kode PSD asli alih-alih menyalin stub.
