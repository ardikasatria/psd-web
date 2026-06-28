# Deploy PSD ke VM — Fase 0 + Fase 1

Runbook deploy stack PSD (frontend Next.js + backend FastAPI + Postgres + Redis + MinIO + Meilisearch) ke satu VM memakai Docker Compose + Caddy (HTTPS otomatis).

**Checklist rilis Fase 0:** [Instructions/PSD_Checklist_Kesiapan_Rilis.md](../Instructions/PSD_Checklist_Kesiapan_Rilis.md)  
**Panduan VM awal:** [Instructions/Sudah/PSD_Deploy_VM.md](../Instructions/Sudah/PSD_Deploy_VM.md)  
**Indeks Fase 1 (Langkah 48–60):** [Instructions/PSD_FASE1_INDEX.md](../Instructions/PSD_FASE1_INDEX.md)  
**Upgrade Fase 0 → Fase 1:** [Instructions/PSD_FASE1_DEPLOY.md](../Instructions/PSD_FASE1_DEPLOY.md)  
**Roadmap fitur:** [Instructions/PSD_Roadmap_Fase_1.md](../Instructions/PSD_Roadmap_Fase_1.md)

## Tata letak monorepo

```
psd-web/
  psd-backend/
  psd-frontend/
  deploy/          ← Anda di sini
```

## Runbook rilis Fase 0 (singkat)

Sesuai checklist §9 — jalankan dari atas ke bawah:

| # | Langkah | Perintah / catatan |
|---|---------|-------------------|
| 1 | Naikkan layanan | `./scripts/deploy.sh` (Postgres, Redis, MinIO, Meilisearch, backend, frontend, Caddy) |
| 2 | Bucket MinIO | Otomatis via service `minio-init` (`psd-assets`, `psd-media`, `psd-submissions`) |
| 3 | Set `.env` | `./scripts/init-env.sh projeksainsdata.com` + isi `OPENAI_API_KEY` bila AI aktif |
| 4 | Migrasi 0→head | Otomatis di `deploy.sh` → head `048_mlops_features` |
| 5 | Seed pilot | `./scripts/deploy.sh --seed` → `seed` + `seed_content` + `reindex` |
| 5b | OAuth klien | Otomatis di `deploy.sh` → `seed-oauth-clients.sh` (secret dicetak sekali) |
| 6 | Frontend real | `NEXT_PUBLIC_USE_MOCKS=false` sudah di `docker-compose.prod.yml` build args |
| 7 | Verifikasi | `./scripts/verify.sh` + `./scripts/verify-phase0.sh` |
| 8 | Gotcha | `path_key` di file repo; kuota tier; Celery opsional prod (§7 checklist) |
| 9 | Pilot ITERA | Smoke E2E manual §6 checklist |

## Persiapan sekali di VM

```bash
# Docker + firewall (lihat PSD_Deploy_VM.md Bagian 2–3)

git clone <URL_REPO> ~/psd-web && cd ~/psd-web/deploy

chmod +x scripts/*.sh
./scripts/init-env.sh projeksainsdata.com

# DNS A record:
#   projeksainsdata.com, www.projeksainsdata.com → IP VM (frontend)
#   api.projeksainsdata.com → IP VM (backend + OIDC issuer)
#   storage.projeksainsdata.com → IP VM (media MinIO)
#   app.projeksainsdata.com → IP VM (opsional; redirect ke apex)
#   git/hub/bi/ml.<domain> → IP VM (Fase 1 — lihat PSD_FASE1_DEPLOY.md)
```

## Deploy pertama (produksi)

```bash
cd ~/psd-web/deploy
./scripts/deploy.sh --seed
./scripts/verify.sh
```

Tanpa data demo (DB kosong setelah migrasi):

```bash
./scripts/deploy.sh
```

## Redeploy (setelah git pull)

```bash
cd ~/psd-web && git pull && cd deploy
./scripts/deploy.sh
```

`deploy.sh` selalu menjalankan `alembic upgrade head`.

## Uji lokal di VM tanpa domain

```bash
cd deploy
./scripts/deploy-local.sh --seed
./scripts/verify-phase0.sh --local
```

Akses: `http://<VM_IP>:3000`

## File penting

| File | Fungsi |
|---|---|
| `docker-compose.prod.yml` | Stack produksi + Caddy HTTPS + Meilisearch |
| `docker-compose.local.yml` | Uji via IP (tanpa TLS) |
| `Caddyfile` | Reverse proxy apex + `api.*`, `storage.*`; redirect `www`/`app` → apex |
| `.env` | Rahasia (buat via `init-env.sh`) |
| `scripts/deploy.sh` | Build, up, migrasi (`--seed` opsional) |
| `scripts/seed-pilot.sh` | Urutan seed §4 checklist |
| `scripts/verify.sh` | Health + migrasi + OIDC discovery + endpoint publik |
| `scripts/verify-phase0.sh` | Hub Transformer, kategori, LMS, dll. |
| `scripts/init-oauth-key.sh` | Buat `secrets/psd_oidc.pem` (RSA OIDC) |
| `scripts/seed-oauth-clients.sh` | Daftar klien Gitea/Hub/Superset |
| `scripts/backup-db.sh` | Dump Postgres |

## Variabel lingkungan

### `deploy/.env` (rahasia)

| Variabel | Fungsi |
|---|---|
| `DOMAIN` | Domain utama (mis. `projeksainsdata.com`) |
| `POSTGRES_*` | Kredensial database |
| `MINIO_ROOT_*` | Kredensial MinIO |
| `JWT_SECRET` | Token auth |
| `MEILI_KEY` | Master key Meilisearch |
| `OPENAI_API_KEY` | Opsional — sintesis & ruang ide AI |
| `AI_MODEL` | Default `gpt-4o-mini` |
| `FACTORY_RUN_TIMEOUT_S` | Watchdog run pipeline DuckDB (default 90) |
| `PSD_OIDC_KEY_ID` | Penanda kunci JWKS (default `psd-key-1`) |
| `PSD_EMAIL_ENABLED` | Email notifikasi + auth via Resend (Langkah 59–60) |
| `RESEND_API_KEY` | API key Resend (SMTP password = key yang sama) |
| `PSD_EMAIL_SENDER` | Alamat pengirim terverifikasi |
| `PSD_EMAIL_UNSUBSCRIBE_SECRET` | HMAC footer unsubscribe notifikasi |
| `PSD_MLFLOW_ENABLED` | MLflow tracking (Langkah 55) |
| `PSD_SERVING_ENABLED` | Inferensi model (Langkah 56) |
| `PSD_ASSISTANT_ENABLED` | AI asisten (Langkah 57) |
| `OPENAI_API_KEY` | Sintesis, ruang ide AI, asisten |

Kunci RSA OIDC **tidak** disimpan di `.env` — file `secrets/psd_oidc.pem` (dibuat `init-env.sh` / `init-oauth-key.sh`), di-mount ke backend sebagai `/run/secrets/psd_oidc.pem`.

Backend & frontend menerima konfigurasi turunan — lihat `docker-compose.prod.yml`.

### Frontend (build-time)

| Variabel | Produksi |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.<DOMAIN>` |
| `NEXT_PUBLIC_SITE_URL` | `https://<DOMAIN>` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_APP_NAME` | `Projek Sains Data` |

> Mengganti `NEXT_PUBLIC_*` membutuhkan **rebuild** frontend.

## OAuth/OIDC Provider (Langkah 48)

PSD menjadi identity provider tunggal untuk Gitea (50), JupyterHub (52), dan Superset (53).

### Persiapan sekali

```bash
# Saat init-env baru — kunci RSA otomatis dibuat:
./scripts/init-env.sh projeksainsdata.com

# VM yang sudah punya .env (upgrade dari Fase 0 saja):
chmod +x scripts/init-oauth-key.sh
./scripts/init-oauth-key.sh
./scripts/deploy.sh
```

### Yang di-set otomatis (produksi)

| Variabel backend | Nilai produksi |
|---|---|
| `PSD_OIDC_ISSUER` | `https://api.<DOMAIN>` |
| `PSD_OIDC_PRIVATE_KEY_FILE` | `/run/secrets/psd_oidc.pem` |
| `PSD_OAUTH_GIT_BASE_URL` | `https://git.<DOMAIN>` |
| `PSD_OAUTH_HUB_BASE_URL` | `https://hub.<DOMAIN>` |
| `PSD_OAUTH_BI_BASE_URL` | `https://bi.<DOMAIN>` |

`deploy.sh` menjalankan migrasi `043_oauth` lalu `seed-oauth-clients.sh`. **Secret klien** (`gitea`, `jupyterhub`, `superset`) dicetak ke stdout **sekali** — salin ke pengelola rahasia sebelum layanan konsumen di-wire (Langkah 50/52/53).

### Verifikasi OIDC

```bash
curl -s "https://api.<DOMAIN>/.well-known/openid-configuration" | jq .
curl -s "https://api.<DOMAIN>/oauth/jwks" | jq .
```

Harus menampilkan `issuer`, `authorization_endpoint`, dan kunci publik RS256.

### Wiring konsumen (nanti)

| Layanan | Discovery URL | Callback (contoh) |
|---|---|---|
| Gitea | `https://api.<DOMAIN>/.well-known/openid-configuration` | `https://git.<DOMAIN>/user/oauth2/PSD/callback` |
| JupyterHub | endpoint discovery di atas | `https://hub.<DOMAIN>/hub/oauth_callback` |
| Superset | endpoint discovery di atas | `https://bi.<DOMAIN>/oauth-authorized/psd` |

Scope: `openid profile email` (+ `repo:read repo:write` untuk Gitea).

## Celery & Worker (Langkah 49)

Job berat (sintesis AI, ruang data, pipeline DuckDB) dijalankan via **Celery** — bukan lagi `BackgroundTasks` di proses API.

### Arsitektur produksi

| Service | Antrian | Konkurensi | Job |
|---|---|---|---|
| `worker-ai` | `ai` | 4 | `run_synthesis_job` |
| `worker-pabrik` | `pabrik_data` | 1 | `run_room_data_job`, `run_pipeline_job`, drift |
| `worker-email` | `email` | 2 | notifikasi email (Langkah 59) |
| `worker-spark` | `spark` | 1 | `run_spark_pipeline_job` (profile `spark`, opsional) |
| `celery-beat` | — | — | digest email harian (Langkah 59) |
| `flower` | — | — | Pemantauan (port `5555`, bind localhost) |

Redis DB terpisah: broker `redis:6379/1`, result `redis:6379/2` (cache app tetap `/0`).

`docker-compose.prod.yml` mengatur `PSD_USE_CELERY=true` otomatis untuk backend + worker.

### Dev lokal (tanpa worker)

Default `PSD_USE_CELERY=false` — router fallback ke `BackgroundTasks` seperti sebelumnya.

### Verifikasi worker

```bash
# Setelah deploy
docker compose -f docker-compose.prod.yml ps worker-ai worker-pabrik worker-email celery-beat
# Bila Spark aktif:
# docker compose -f docker-compose.prod.yml --profile spark ps worker-spark
docker compose -f docker-compose.prod.yml logs worker-email --tail 20

# Flower (dari VM via SSH tunnel)
ssh -L 5555:127.0.0.1:5555 user@vm
# buka http://localhost:5555
```

Uji unit (repo backend):

```bash
cd psd-backend && pytest app/tasks/tests/test_tasks.py -q
```

## Gitea / Git (Langkah 50)

Versioning nyata via Gitea; PSD tetap orkestrasi metadata + dual-write ke `files[]`.

### Stack produksi

| Service | Fungsi |
|---|---|
| `gitea` + `gitea-db` | Git hosting + Postgres metadata |
| `git.<DOMAIN>` | HTTPS via Caddy → Gitea |
| LFS | Bucket MinIO `psd-gitea-lfs` |

Backend: `PSD_GITEA_ENABLED=true`, API internal `http://gitea:3000`.

### Setup sekali (setelah deploy)

```bash
# 1. Buat admin di https://git.<DOMAIN>/
# 2. Token admin → GITEA_ADMIN_TOKEN di deploy/.env → redeploy
./scripts/init-gitea-oauth.sh          # panduan OAuth PSD → Gitea
./scripts/backfill-gitea.sh            # impor files[] lama
```

Repo baru otomatis di-provision ke Gitea. Flip source of truth per repo:

`POST /api/v1/repos/{id}/gitea/flip` (owner/staf).

Endpoint UI: `GET .../gitea/files`, `GET .../gitea/diff?base=&head=`.

## Pull Request & Kontribusi (Langkah 51)

Alur fork → branch → PR → review → merge via Gitea API. Tidak perlu service deploy baru (memakai Gitea Langkah 50).

Endpoint API (`/api/v1/repos/{id}/pulls/...`); UI tab **Kontribusi** di halaman repo.

```bash
pytest app/contrib/tests/test_contrib.py -q
```

## JupyterHub Notebook (Langkah 52)

Notebook mandiri via JupyterHub + OAuth PSD. CPU-only, batas tier gamifikasi, idle-culling.

**DNS:** `hub.<DOMAIN>` → Caddy → service `jupyterhub`.

### Setup sekali

```bash
# 1. Seed klien OAuth (salin secret jupyterhub)
./scripts/seed-oauth-clients.sh
# → HUB_OIDC_SECRET di deploy/.env

# 2. Kunci enkripsi auth_state Hub
openssl rand -hex 32   # → JUPYTERHUB_CRYPT_KEY di deploy/.env

# 3. Build image single-user (DockerSpawner)
chmod +x scripts/build-hub-images.sh
./scripts/build-hub-images.sh

# 4. Redeploy stack
docker compose -f docker-compose.prod.yml up -d --build jupyterhub backend frontend
```

Klaim OIDC `psd_tier` (pemula/menengah/lanjut) menentukan batas CPU/RAM di spawn hook.
SDK `import psd` di notebook: `psd.load("psd://owner/dataset/file.csv")` via presigned MinIO.

```bash
pytest ../psd-jupyterhub/app/tests/test_hub.py -q
pytest app/hub/tests/test_hub.py -q
```

## Superset Embed (Langkah 53)

Self-serve BI via Superset; dashboard native Langkah 46 tetap untuk kebutuhan ringan.

**DNS:** `bi.<DOMAIN>` → Caddy → service `superset`.

Dua jalur identitas:
- **Analis** → login Superset UI via OAuth PSD (klien `superset`)
- **Penonton embed** → guest token dari `POST /api/bi/guest-token` (tanpa login Superset)

### Setup sekali

```bash
./scripts/seed-oauth-clients.sh     # salin secret → BI_OIDC_SECRET
# Set SUPERSET_* di deploy/.env, lalu:
docker compose -f docker-compose.prod.yml up -d superset superset-db backend
# Buat koneksi database gold di Superset UI → catat id → SUPERSET_GOLD_DB_ID
# Buat dashboard di Superset → enable embed via API atau UI
```

Promote dataset dari Ruang Analitik: tombol **Promote ke Superset** (butuh pipeline run gold).

```bash
pytest app/superset/tests/test_superset.py -q
```

## Spark / Airflow (Langkah 54 — opsional)

Pipeline besar di luar DuckDB: **spec kanvas tidak berubah** — backend menerjemahkan DAG yang sama ke Spark atau mengekspor DAG Airflow.

### Pemilih engine

| Nilai | Perilaku |
|---|---|
| `auto` | DuckDB default; Spark bila estimasi input ≥ 5 GiB |
| `duckdb` | Selalu antrian `pabrik_data` |
| `spark` | Antrian `spark` (butuh `PSD_SPARK_ENABLED=true` + worker) |

UI Pabrik Data: dropdown **Engine** di toolbar pipeline. API: `PATCH /pipelines/{slug}` (`engine`, `schedule_cron`).

### Aktifkan Spark di produksi

```bash
# deploy/.env
PSD_SPARK_ENABLED=true
PSD_SPARK_MASTER=local[*]   # atau spark://master:7077

docker compose -f docker-compose.prod.yml --profile spark up -d worker-spark backend
```

Worker Spark memakai image backend yang sama; `pyspark` di-import saat runtime (pasang di image bila cluster Spark nyata).

### Airflow (export saja)

Pipeline dengan `schedule_cron` dapat diekspor:

```bash
curl -H "Cookie: psd_token=..." \
  "https://api.<DOMAIN>/api/v1/pipelines/<slug>/airflow-dag" > dag.py
```

Deploy Airflow sendiri di luar compose PSD; generator menghasilkan `PythonOperator` per node.

```bash
pytest app/engine/tests/test_engine.py -q
```

## MLflow Registry & Monitoring (Langkah 55)

Base MLOps: daftarkan model dari repo/kompetisi ke MLflow, hitung drift via job Pabrik Data, pantau di Ruang Analitik.

**DNS:** `ml.<DOMAIN>` → Caddy → service `mlflow` (UI tracking).

### Stack produksi

| Service | Fungsi |
|---|---|
| `mlflow-db` | Metadata store Postgres |
| `mlflow` | Tracking server + artifact root `s3://psd-assets/mlflow/` |

Backend API: `/api/ml/registries` (bukan `/api/v1`).

Skema gold: **`monitoring_model_metrics`** (`model_name`, `model_version`, `feature`, `metric`, `value`, `status`, `computed_at`). Metrik level-model memakai `feature='__model__'`.

### Alur

1. Buat registry dari repo `kind=model` (+ opsional `reference_source_id` untuk baseline drift).
2. Versi baru dari repo atau submission kompetisi → MLflow model version + metrik.
3. `POST .../drift/run` — job Celery (`pabrik_data`) bandingkan referensi vs data produksi.
4. `POST .../monitoring` — buat dashboard Ruang Analitik (widget PSI, akurasi, distribusi).

```bash
# deploy/.env
MLFLOW_DB_PASSWORD=...
PSD_MLFLOW_ENABLED=true

docker compose -f docker-compose.prod.yml up -d mlflow mlflow-db backend worker-pabrik
```

```bash
pytest app/mlops/tests/test_mlops.py -q
```

## Serving Model (Langkah 56)

Inferensi terkelola dari registry MLflow; kuota per tier gamifikasi (Redis).

```bash
# deploy/.env — butuh MLflow aktif
PSD_SERVING_ENABLED=true
PSD_SERVING_REDIS_QUOTA=true

docker compose -f docker-compose.prod.yml up -d --build backend
```

API: `POST /api/models/{slug}/predict` · UI panel inferensi di `/ml/{slug}`.

```bash
pytest app/serving/tests/test_serving.py -q
```

## AI Asisten (Langkah 57)

Rekomendasi personal + asisten kontekstual; kuota tier via Redis.

```bash
PSD_ASSISTANT_ENABLED=true
OPENAI_API_KEY=sk-...
docker compose -f docker-compose.prod.yml up -d --build backend worker-ai
```

UI: `/assistant` · feed di dashboard · API `POST /api/assistant/ask`.

```bash
pytest app/assistant/tests/test_assistant.py -q
```

## Cache & Performa (Langkah 58 — reaktif)

Default produksi: cache **mati** (`PSD_PERF_CACHE_ENABLED=false`). Aktifkan setelah `/admin/perf` menunjukkan bottleneck.

```bash
PSD_PERF_ENABLED=true
PSD_PERF_CACHE_ENABLED=false   # true hanya bila terbukti perlu
PSD_PERF_REDIS=true
```

```bash
pytest app/perf/tests/test_perf.py -q
```

## Email SMTP / Resend (Langkah 59 + 60)

**Dua jalur:** auth (60, sinkron) + notifikasi aktivitas (59, async antrian `email`).

### Setup Resend (wajib go-live)

1. Verifikasi domain pengirim di dashboard Resend (SPF/DKIM/DMARC).
2. Isi `deploy/.env`:

```bash
PSD_EMAIL_ENABLED=true
PSD_EMAIL_PROVIDER=smtp
PSD_EMAIL_SENDER=no-reply@<DOMAIN>
RESEND_API_KEY=re_...
PSD_EMAIL_UNSUBSCRIBE_SECRET=$(openssl rand -hex 32)
PSD_EMAIL_REDIS=true
```

3. Redeploy worker email:

```bash
docker compose -f docker-compose.prod.yml up -d --build backend worker-email celery-beat
```

### Verifikasi

```bash
# Unit
cd psd-backend && pytest app/email/tests/ -q

# Smoke manual
# - Daftar → email verifikasi (60) → /verify-email?token=...
# - Lupa kata sandi → email reset (60)
# - Trigger notifikasi (mis. PR) → email aktivitas (59) via worker-email logs
docker compose -f docker-compose.prod.yml logs worker-email --tail 30
```

UI: `/check-email`, `/settings/notifications`, `/email/unsubscribe` (frontend) · API unsubscribe: `https://api.<DOMAIN>/email/unsubscribe?token=...`

Detail tahap deploy: [PSD_FASE1_DEPLOY.md § Tahap A](../Instructions/PSD_FASE1_DEPLOY.md).

## Verifikasi setelah deploy

```bash
./scripts/verify.sh              # health + alembic head + endpoint publik
./scripts/verify-phase0.sh       # modul Fase 0 (38–47)
```

- `https://api.<DOMAIN>/api/v1/health` → `{"status":"ok"}`
- `https://api.<DOMAIN>/.well-known/openid-configuration` → dokumen OIDC
- `https://<DOMAIN>/factory/pipelines` — kanvas Pabrik Data
- `https://<DOMAIN>/analytics` — Ruang Analitik
- `https://<DOMAIN>/hub/transformer` — hub Transformer
- `https://<DOMAIN>/robots.txt` dan `https://<DOMAIN>/sitemap.xml` — SEO

Login demo (setelah `--seed`): `budi@psd.id` / `demo`

## Gotcha integrasi (wajib dicek sebelum pilot)

1. **`path_key`** — unggah aset harus menyimpan kunci MinIO di `files[]`; seed sudah memakai `path_key`.
2. **Kuota tier** — `SYNTH_TIER` / `PIPELINE_TIER` terpasang di kode gamifikasi.
3. **BackgroundTasks vs Celery** — produksi memakai Celery (`worker-ai` + `worker-pabrik`; `worker-spark` opsional); dev lokal default BackgroundTasks.
4. **Urutan migrasi** — jangan lompati; head saat ini `048_mlops_features`.
5. **Email produksi** — `PSD_EMAIL_ENABLED=true` + domain Resend terverifikasi sebelum go-live pilot.
6. **Kunci OIDC** — `secrets/psd_oidc.pem` wajib ada sebelum `docker compose up` produksi; backup file ini (ID token invalid bila hilang).
7. **Kategori Transformer** — di-seed via `seed_content` sebelum hub bernilai.
8. **MSW** — mati di produksi (`NEXT_PUBLIC_USE_MOCKS=false`).

## Troubleshooting media / foto profil

Media publik: **`https://storage.<DOMAIN>/psd-media/`**

Jika TLS `storage.*` belum aktif setelah DNS diperbaiki:

```bash
chmod +x scripts/fix-storage-tls.sh
./scripts/fix-storage-tls.sh
```

Jika avatar lama memakai URL `api.<DOMAIN>` (migrasi sementara):

```bash
chmod +x scripts/migrate-storage-urls.sh
# Edit FROM/TO di script bila perlu, atau jalankan SQL manual
```

Fallback sementara: `https://api.<DOMAIN>/psd-media/` (proxy MinIO di Caddyfile masih aktif).

## Backup

```bash
./scripts/backup-db.sh
```

Cadangkan juga volume `miniodata` secara berkala.

## Selesai bila

- [ ] HTTPS valid di apex `<DOMAIN>`, `api.*`, dan `storage.*`
- [ ] `alembic current` = `048_mlops_features (head)`
- [ ] OIDC discovery & JWKS merespons di `https://api.<DOMAIN>/`
- [ ] Frontend menarik data API nyata (mock mati)
- [ ] Seed pilot + reindex Meilisearch (staging)
- [ ] `./scripts/verify.sh` lulus
- [ ] Smoke E2E §6 checklist dicatat (lulus/gagal)
