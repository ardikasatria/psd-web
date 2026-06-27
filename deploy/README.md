# Deploy PSD ke VM — Fase 0

Runbook deploy stack PSD (frontend Next.js + backend FastAPI + Postgres + Redis + MinIO + Meilisearch) ke satu VM memakai Docker Compose + Caddy (HTTPS otomatis).

**Checklist rilis lengkap:** [Instructions/PSD_Checklist_Kesiapan_Rilis.md](../Instructions/PSD_Checklist_Kesiapan_Rilis.md)  
**Panduan VM detail:** [Instructions/Sudah/PSD_Deploy_VM.md](../Instructions/Sudah/PSD_Deploy_VM.md)

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
| 4 | Migrasi 0→47 | Otomatis di `deploy.sh` → head `042_dashboards` |
| 5 | Seed pilot | `./scripts/deploy.sh --seed` → `seed` + `seed_content` + `reindex` |
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
#   api.projeksainsdata.com → IP VM (backend)
#   storage.projeksainsdata.com → IP VM (media MinIO)
#   app.projeksainsdata.com → IP VM (opsional; redirect ke apex)
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
| `scripts/verify.sh` | Health + migrasi + endpoint publik |
| `scripts/verify-phase0.sh` | Hub Transformer, kategori, LMS, dll. |
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

Backend & frontend menerima konfigurasi turunan — lihat `docker-compose.prod.yml`.

### Frontend (build-time)

| Variabel | Produksi |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.<DOMAIN>` |
| `NEXT_PUBLIC_SITE_URL` | `https://<DOMAIN>` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_APP_NAME` | `Projek Sains Data` |

> Mengganti `NEXT_PUBLIC_*` membutuhkan **rebuild** frontend.

## Verifikasi setelah deploy

```bash
./scripts/verify.sh              # health + alembic head + endpoint publik
./scripts/verify-phase0.sh       # modul Fase 0 (38–47)
```

- `https://api.<DOMAIN>/api/v1/health` → `{"status":"ok"}`
- `https://<DOMAIN>/factory/pipelines` — kanvas Pabrik Data
- `https://<DOMAIN>/analytics` — Ruang Analitik
- `https://<DOMAIN>/hub/transformer` — hub Transformer
- `https://<DOMAIN>/robots.txt` dan `https://<DOMAIN>/sitemap.xml` — SEO

Login demo (setelah `--seed`): `budi@psd.id` / `demo`

## Gotcha integrasi (wajib dicek sebelum pilot)

1. **`path_key`** — unggah aset harus menyimpan kunci MinIO di `files[]`; seed sudah memakai `path_key`.
2. **Kuota tier** — `SYNTH_TIER` / `PIPELINE_TIER` terpasang di kode gamifikasi.
3. **BackgroundTasks vs Celery** — dev pakai BackgroundTasks; prod skala besar pertimbangkan Celery worker.
4. **Urutan migrasi** — jangan lompati; head saat ini `042_dashboards`.
5. **Kategori Transformer** — di-seed via `seed_content` sebelum hub bernilai.
6. **MSW** — mati di produksi (`NEXT_PUBLIC_USE_MOCKS=false`).

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
- [ ] `alembic current` = `042_dashboards (head)`
- [ ] Frontend menarik data API nyata (mock mati)
- [ ] Seed pilot + reindex Meilisearch (staging)
- [ ] `./scripts/verify.sh` lulus
- [ ] Smoke E2E §6 checklist dicatat (lulus/gagal)
