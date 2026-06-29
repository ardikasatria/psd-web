# PSD — Panduan Deploy Fase 1 (upgrade dari Fase 0)

Runbook **bertahap** untuk melanjutkan VM Fase 0 yang sudah jalan ke stack Fase 1 penuh.
Stack produksi memakai **`deploy/docker-compose.prod.yml`** + Caddy + skrip di **`deploy/scripts/`**.

> **Runbook operasional harian:** [deploy/README.md](../deploy/README.md)  
> **Indeks langkah & uji:** [PSD_FASE1_INDEX.md](./PSD_FASE1_INDEX.md)  
> **Perencanaan fitur:** [PSD_Roadmap_Fase_1.md](./PSD_Roadmap_Fase_1.md)

---

## 0. Prinsip deploy (baca dulu)

1. **Jangan aktifkan semua layanan sekaligus.** Layanan 🔴 (Gitea, JupyterHub, Superset, MLflow, Spark)
   masing-masing menambah RAM. Deploy **mengikuti tahap A→F** di indeks.
2. **Email wajib di Tahap A** — verifikasi & reset kata sandi (Langkah 60) dibutuhkan sejak go-live;
   email notifikasi aktivitas (Langkah 59) menyala otomatis saat fitur sumbernya aktif.
3. **Non-destruktif.** Tambah service & migrasi Alembic; jangan hapus jalur lama (`files[]`, Colab)
   sampai yakin.
4. **Satu VM kecil (≤8 GB)** — muat fondasi + email + mungkin JupyterHub *dengan tier ketat*;
   sisanya tunda atau pindah ke VM kedua.

---

## 1. Prasyarat: keadaan Fase 0 Anda

Centang sebelum mulai upgrade:

- [ ] VM sudah menjalankan Fase 0 via `./deploy/scripts/deploy.sh` (Postgres, Redis, MinIO, Meilisearch, backend, frontend, Caddy).
- [ ] DNS aktif: `<DOMAIN>`, `api.<DOMAIN>`, `storage.<DOMAIN>` → IP VM.
- [ ] `deploy/.env` ada; `secrets/psd_oidc.pem` ada (Langkah 48).
- [ ] `curl https://api.<DOMAIN>/api/v1/health` → OK.
- [ ] Alembic saat ini ≥ `043_oauth` (ideal: head `048_mlops_features` setelah pull terbaru).
- [ ] **Akun Resend** + domain pengirim diverifikasi (SPF/DKIM/DMARC) — untuk Langkah 59–60.

**Estimasi RAM layanan Fase 1 (kasar, idle):**

| Layanan | RAM idle |
|---|---|
| Backend + frontend + worker-ai/pabrik/email | ~1–2 GB |
| Gitea + DB | ~0.4 GB |
| JupyterHub (hub saja) | ~0.3 GB |
| **+ tiap notebook aktif** | **1–8 GB** (tier) |
| Superset + DB | ~1–2 GB |
| MLflow + DB | ~0.5 GB |

---

## 2. Peta subdomain & DNS

Semua subdomain → IP VM yang sama (Caddy terminate TLS):

```
<DOMAIN>              → frontend Next.js (app PSD)
api.<DOMAIN>          → backend FastAPI + OIDC issuer (Langkah 48)
storage.<DOMAIN>      → MinIO (media publik)
git.<DOMAIN>          → Gitea (50) — DNS siapkan sebelum go-live Git
hub.<DOMAIN>          → JupyterHub (52)
bi.<DOMAIN>           → Superset (53)
ml.<DOMAIN>           → MLflow (55)
```

**Endpoint penting (tidak perlu subdomain terpisah):**

| Jalur | Fungsi |
|---|---|
| `https://<DOMAIN>/verify-email` | UI verifikasi (frontend) |
| `https://<DOMAIN>/check-email` | Instruksi setelah daftar / reset |
| `https://<DOMAIN>/forgot-password` | Lupa kata sandi |
| `https://api.<DOMAIN>/email/unsubscribe` | Unsubscribe notifikasi (Langkah 59) |
| `https://api.<DOMAIN>/.well-known/openid-configuration` | OIDC discovery |

**DNS email (Resend):** record SPF/DKIM/DMARC di panel Resend untuk domain pengirim
(mis. `no-reply@projeksainsdata.com`). Tanpa ini, email auth & notifikasi masuk spam.

---

## 3. Upgrade cepat: Fase 0 → fondasi Fase 1 (Tahap A)

Jalankan dari VM (asumsi repo sudah `git pull`):

```bash
cd ~/psd-web/deploy

# 1. Perbarui .env — salin variabel baru dari .env.example, isi rahasia:
#    RESEND_API_KEY, PSD_EMAIL_UNSUBSCRIBE_SECRET (openssl rand -hex 32),
#    PSD_EMAIL_ENABLED=true, PSD_EMAIL_SENDER=no-reply@<DOMAIN>
nano .env   # atau merge manual dari deploy/.env.example

# 2. Deploy (build, up, migrasi, seed OAuth)
./scripts/deploy.sh

# 3. Verifikasi
./scripts/verify.sh
```

`deploy.sh` otomatis: build stack, `alembic upgrade head`, seed klien OAuth, reload Caddy.

**Service baru yang ikut naik (meski fitur belum diaktifkan):** `gitea`, `jupyterhub`, `superset`, `mlflow`, `worker-ai`, `worker-pabrik`, `worker-email`, `celery-beat`, `flower`. Container idle relatif kecil; yang boros RAM adalah **notebook JupyterHub saat spawn** dan **Superset worker**.

---

## 4. Tahap deploy detail

### Tahap A — Fondasi: 48 + 49 + 59 + 60

#### 48 OAuth/OIDC (sudah di `deploy.sh`)

```bash
# Kunci RSA (sekali):
./scripts/init-oauth-key.sh          # → secrets/psd_oidc.pem

# Setelah deploy:
curl -s "https://api.${DOMAIN}/.well-known/openid-configuration" | jq .issuer
curl -s "https://api.${DOMAIN}/oauth/jwks" | jq .

# Secret klien internal (dicetak sekali):
./scripts/seed-oauth-clients.sh
# → salin GITEA / HUB / BI secret ke .env sebelum wire konsumen
```

Env otomatis di compose: `PSD_OIDC_ISSUER=https://api.${DOMAIN}`, mount PEM.

#### 49 Celery

| Service | Antrian | Perintah worker |
|---|---|---|
| `worker-ai` | `ai` | sintesis AI |
| `worker-pabrik` | `pabrik_data` | ruang data, pipeline DuckDB, drift |
| `worker-email` | `email` | notifikasi Langkah 59 |
| `worker-spark` | `spark` | profile `spark`, opsional |
| `celery-beat` | — | digest email harian |
| `flower` | — | `http://127.0.0.1:5555` (SSH tunnel) |

```bash
docker compose -f docker-compose.prod.yml ps worker-ai worker-pabrik worker-email celery-beat
docker compose -f docker-compose.prod.yml logs worker-email --tail 30
```

`PSD_USE_CELERY=true` sudah di compose produksi.

#### 59 Email notifikasi (Resend SMTP / HTTP)

```bash
# deploy/.env — WAJIB untuk go-live
PSD_EMAIL_ENABLED=true
PSD_EMAIL_PROVIDER=smtp          # atau http
PSD_EMAIL_SENDER=no-reply@<DOMAIN>
RESEND_API_KEY=re_...
PSD_EMAIL_UNSUBSCRIBE_SECRET=<openssl rand -hex 32>
PSD_EMAIL_REDIS=true
DEV_EMAIL_ECHO=false             # otomatis false di compose prod
```

SMTP Resend: host `smtp.resend.com`, port `587`, user `resend`, password = API key.

**Perilaku:**
- Hook `notify()` → enqueue Celery `psd.email.send_event` (antrian `email`).
- Preferensi: immediate / digest / off + unsubscribe HMAC.
- Dedup Redis per `notification_id`.
- Digest harian via `celery-beat`.

**Redeploy setelah ubah env email:**

```bash
docker compose -f docker-compose.prod.yml up -d --build backend worker-email celery-beat
```

#### 60 Email auth (verify / reset / ganti email)

Memakai **provider & template yang sama** (Langkah 59), template auth elegan Bahasa Indonesia.

**Perilaku:**
- Kirim **sinkron** di jalur auth (daftar, forgot-password, change-email, resend) — respons cepat & kritis.
- Token: JWT purpose (`verify`, `reset`, `change_email`) — bukan env terpisah.
- UI frontend: `/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/settings/security`.

**Smoke test auth email:**

```bash
# 1. Daftar akun uji di https://<DOMAIN>/register
# 2. Cek inbox verifikasi (atau log worker jika DEV_EMAIL_ECHO=true di dev)
# 3. /forgot-password → email reset → /reset-password?token=...
# 4. /settings/security → kirim ulang verifikasi
```

---

### Tahap B — JupyterHub (52)

```bash
# Secret OAuth (dari seed 48):
# HUB_OIDC_SECRET=...  JUPYTERHUB_CRYPT_KEY=$(openssl rand -hex 32)

./scripts/build-hub-images.sh
docker compose -f docker-compose.prod.yml up -d --build jupyterhub backend frontend

# Verifikasi: https://hub.<DOMAIN> → login PSD → spawn notebook
```

⚠️ Mount `/var/run/docker.sock` — pantau RAM; idle-culler & tier wajib.

Detail: [deploy/README.md § JupyterHub](../deploy/README.md).

---

### Tahap C — MLOps (55 → 56)

```bash
# deploy/.env
PSD_MLFLOW_ENABLED=true
MLFLOW_DB_PASSWORD=...

docker compose -f docker-compose.prod.yml up -d mlflow mlflow-db backend worker-pabrik

# Serving (56) — hanya bila butuh inferensi produksi:
PSD_SERVING_ENABLED=true
docker compose -f docker-compose.prod.yml up -d --build backend
```

UI: `https://<DOMAIN>/ml` · API inferensi: `POST /api/models/{slug}/predict`

---

### Tahap D — Kolaborasi & BI (50 → 51, 53)

**50 Gitea**

```bash
# Token admin dari UI git.<DOMAIN> → GITEA_ADMIN_TOKEN di .env
./scripts/init-gitea-oauth.sh
./scripts/backfill-gitea.sh    # repo lama → commit awal

# --- SSH Git (pisahkan dari SSH admin VM) ---
# Path C (interim): GITEA_SSH_PORT=2222 — buka 2222 di firewall idcloudhost
echo 'GITEA_SSH_PORT=2222' >> .env
ufw allow 2222/tcp
docker compose -f docker-compose.prod.yml up -d gitea backend
./scripts/verify-gitea-ssh.sh

# Path A (disarankan, gaya GitHub): port 22 → Gitea, admin VM → 2202
# Baca: Instructions/perbaikan-gitea/PERBAIKAN_SSH_GITEA_GITHUB.md
# ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --check
# sudo ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --apply
# Uji: ssh -T git@git.<DOMAIN>  → "Hi <user>!" dari Gitea
```

**Keamanan SSH:** Jangan biarkan `ssh git@git.<DOMAIN>` (port 22) menuju shell VM. Setelah Path A,
admin masuk `ssh -p 2202 user@<ip>`. Disarankan: kunci saja untuk admin, fail2ban, batasi IP admin.

**51 PR** — tidak perlu service baru (tab Kontribusi di halaman repo).

**53 Superset**

```bash
# BI_OIDC_SECRET, SUPERSET_* di .env
docker compose -f docker-compose.prod.yml up -d superset superset-db backend
# Set SUPERSET_GOLD_DB_ID setelah koneksi gold dibuat di UI Superset
```

---

### Tahap E — AI Asisten (57)

```bash
PSD_ASSISTANT_ENABLED=true
OPENAI_API_KEY=sk-...
docker compose -f docker-compose.prod.yml up -d --build backend worker-ai
```

UI: `https://<DOMAIN>/assistant` · feed personal di dashboard.

---

### Tahap F — Reaktif / opsional

**58 Cache** — default `PSD_PERF_CACHE_ENABLED=false`; aktifkan hanya setelah `/admin/perf` menunjukkan bottleneck.

**54 Spark** — `PSD_SPARK_ENABLED=true` + `docker compose --profile spark up -d worker-spark`.

---

## 5. Pola rilis setiap merge langkah

```bash
cd ~/psd-web && git pull && cd deploy

# 1. Review deploy/.env.example — tambah variabel baru ke .env bila perlu
# 2. Deploy penuh
./scripts/deploy.sh

# 3. Verifikasi
./scripts/verify.sh

# 4. Uji spesifik langkah (contoh)
cd ../psd-backend
pytest app/email/tests/ -q          # 59+60
pytest app/serving/tests/ -q        # 56
pytest app/assistant/tests/ -q      # 57
```

Head Alembic saat ini: **`048_mlops_features`** (tidak ada migrasi baru untuk 56–60 — settings email di JSON `users.settings`).

---

## 6. Variabel lingkungan Fase 1 (referensi)

Kelola di `deploy/.env` — **jangan commit**.

```bash
# === Wajib / fondasi ===
DOMAIN=
POSTGRES_*  MINIO_ROOT_*  JWT_SECRET  MEILI_KEY
# OIDC: kunci di secrets/psd_oidc.pem (bukan .env)
PSD_OIDC_KEY_ID=psd-key-1

# === Email 59+60 (Resend) ===
PSD_EMAIL_ENABLED=true
PSD_EMAIL_PROVIDER=smtp              # smtp | http
PSD_EMAIL_SENDER=no-reply@<DOMAIN>
RESEND_API_KEY=re_...
PSD_EMAIL_UNSUBSCRIBE_SECRET=         # openssl rand -hex 32
PSD_EMAIL_REDIS=true

# === OAuth konsumen (dari seed-oauth-clients.sh) ===
GITEA_ADMIN_TOKEN=
HUB_OIDC_SECRET=
BI_OIDC_SECRET=
JUPYTERHUB_CRYPT_KEY=

# === Fitur opsional (default false aman) ===
PSD_MLFLOW_ENABLED=false
PSD_SERVING_ENABLED=false
PSD_ASSISTANT_ENABLED=false
PSD_SPARK_ENABLED=false
PSD_PERF_CACHE_ENABLED=false
OPENAI_API_KEY=

# === Superset / MLflow DB ===
SUPERSET_DB_PASSWORD=  SUPERSET_SECRET_KEY=  SUPERSET_GUEST_JWT_SECRET=
SUPERSET_SERVICE_USER=  SUPERSET_SERVICE_PASSWORD=  SUPERSET_GOLD_DB_ID=1
MLFLOW_DB_PASSWORD=
GITEA_DB_PASSWORD=
```

Frontend build-time (rebuild jika ubah): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HUB_URL` — sudah di `docker-compose.prod.yml`.

---

## 7. Checklist deploy minimum pilot ITERA

Centang sebelum membuka ke mahasiswa:

**Fondasi (wajib)**
- [ ] `./scripts/verify.sh` lulus
- [ ] OIDC discovery & JWKS OK di `api.<DOMAIN>`
- [ ] Celery: `worker-ai`, `worker-pabrik`, `worker-email`, `celery-beat` running
- [ ] **Email auth (60):** daftar → email verifikasi sampai · forgot-password → reset OK
- [ ] **Email notifikasi (59):** `PSD_EMAIL_ENABLED=true`, domain Resend terverifikasi
- [ ] `./scripts/deploy.sh --seed` (staging) + smoke E2E manual

**Satu fitur bernilai tinggi (pilih sesuai RAM)**
- [ ] **52 JupyterHub** — bila RAM ≥ 8 GB dengan tier ketat; else tunda / VM kedua
- [ ] **55 MLflow** — bila kelas MLOps jalan

**Menyusul setelah umpan balik**
- [ ] 50/51 Git + PR
- [ ] 53 Superset
- [ ] 56 Serving, 57 Asisten, 54 Spark
- [ ] 58 Cache — reaktif saat `/admin/perf` menunjukkan lambat

---

## 8. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| RAM habis (JupyterHub spawn) | Tier ketat + idle-cull; VM kedua; tunda 52 |
| OIDC callback salah | Redirect URI = nilai seed 48; issuer = `https://api.<DOMAIN>` |
| Email spam / ditolak | Verifikasi domain Resend sebelum go-live; uji kirim nyata |
| User terkunci tanpa email | `DEV_EMAIL_ECHO` hanya dev; prod wajib Resend; UI kirim ulang di `/settings/security` |
| Enumerasi akun (forgot) | API balas `{ok:true}` generik — sudah di router |
| Inbox banjir notifikasi | Preferensi digest; `pr_commented` default digest |
| Docker socket JupyterHub | Batasi akses host; pertimbangkan VM terpisah |
| Optimasi prematur (58) | `PSD_PERF_CACHE_ENABLED=false` default; ukur dulu |

---

## 9. Dua jalur email (59 vs 60)

| | Langkah 60 — Auth | Langkah 59 — Notifikasi |
|---|---|---|
| **Trigger** | Register, forgot, change-email, resend | Hook `notify()` setelah commit |
| **Pengiriman** | Sinkron via provider (jalur request) | Async Celery antrian `email` |
| **Preferensi** | Bypass (wajib transaksional) | immediate / digest / off |
| **Unsubscribe** | Tidak (email keamanan akun) | Footer HMAC + `/email/unsubscribe` |
| **Template** | `auth_templates.py` (elegan BI) | `templates.py` per peristiwa |

Keduanya memakai `RESEND_API_KEY` + `PSD_EMAIL_SENDER` + provider SMTP/HTTP yang sama.

---

## 10. Troubleshooting singkat

```bash
# Log email worker
docker compose -f docker-compose.prod.yml logs worker-email --tail 50

# Beat digest
docker compose -f docker-compose.prod.yml logs celery-beat --tail 20

# Celery flower (dari laptop)
ssh -L 5555:127.0.0.1:5555 user@vm

# Caddy / TLS subdomain baru
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile

# Alembic
docker compose -f docker-compose.prod.yml exec backend alembic current
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Media / avatar: lihat [deploy/README.md § Troubleshooting media](../deploy/README.md).
