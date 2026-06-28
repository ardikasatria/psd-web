# PSD — Panduan Deploy ke VM (Fase 0)

> Runbook deploy stack PSD (frontend Next.js + backend FastAPI + Postgres + Redis + MinIO) ke satu VM memakai Docker Compose + Caddy (HTTPS otomatis). Jalur utama: **cloud VPS**. Varian VM lokal (UTM/Multipass) ada di Bagian 9.

## 1. Siapkan VM

- **OS:** Ubuntu 24.04 LTS (atau 22.04).
- **Spek minimal Fase 0:** 2 vCPU, 4 GB RAM, 40 GB SSD. (4 GB penting agar `next build` tidak kehabisan memori.)
- **Arsitektur:** tidak masalah amd64 atau arm64 — image kita multi-arch dan **dibangun langsung di VM**, jadi tidak ada masalah beda arsitektur dengan Mac M2 Anda.

Masuk via SSH, buat user non-root, perbarui sistem:

```bash
ssh root@IP_VM
adduser psd && usermod -aG sudo psd
# lanjut sebagai user psd
su - psd
sudo apt update && sudo apt upgrade -y
```

## 2. Pasang Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# keluar lalu masuk lagi agar grup docker aktif
exit
```

Masuk kembali, verifikasi: `docker --version` dan `docker compose version`.

## 3. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

> Port database/redis/minio **tidak** dibuka ke publik. Di compose produksi, port internal tidak dipublikasikan ke host — hanya Caddy (80/443) yang terbuka.

## 4. Ambil kode

Tata letak **monorepo** (satu clone, disarankan):

```
~/psd-web/
  psd-backend/
  psd-frontend/
  deploy/          # compose + Caddyfile + skrip deploy
```

Atau dua repo terpisah:

```
~/psd/
  psd-backend/
  psd-frontend/
  deploy/
```

```bash
# Monorepo
git clone <URL_REPO> ~/psd-web && cd ~/psd-web/deploy

# Dua repo
mkdir -p ~/psd && cd ~/psd
git clone <URL_REPO_BACKEND> psd-backend
git clone <URL_REPO_FRONTEND> psd-frontend
# salin folder deploy/ dari salah satu repo
```

## 5. Konfigurasi produksi (`~/psd/deploy/`)

### 5.1 `.env` (rahasia — jangan commit)

Buat rahasia kuat:

```bash
cd ~/psd/deploy
cat > .env <<EOF
DOMAIN=projeksainsdata.com
POSTGRES_USER=psd
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=psd
MINIO_ROOT_USER=psd
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
EOF
```

### 5.2 `docker-compose.prod.yml`

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes: ["miniodata:/data"]
    restart: unless-stopped

  minio-init:
    image: minio/mc
    depends_on: [minio]
    entrypoint: >
      /bin/sh -c "
      sleep 5 &&
      mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} &&
      mc mb -p local/psd-assets || true &&
      mc anonymous set download local/psd-assets || true
      "

  backend:
    build: ../psd-backend
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      BACKEND_CORS_ORIGINS: '["https://${DOMAIN}"]'
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    restart: unless-stopped

  frontend:
    build:
      context: ../psd-frontend
      args:
        NEXT_PUBLIC_API_BASE_URL: https://api.${DOMAIN}
        NEXT_PUBLIC_USE_MOCKS: "false"
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    environment:
      DOMAIN: ${DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddydata:/data
      - caddyconfig:/config
    depends_on: [frontend, backend]
    restart: unless-stopped

volumes:
  pgdata:
  miniodata:
  caddydata:
  caddyconfig:
```

### 5.3 `Caddyfile`

```
{$DOMAIN} {
    reverse_proxy frontend:3000
}

www.{$DOMAIN} {
    redir https://{$DOMAIN}{uri} permanent
}

app.{$DOMAIN} {
    redir https://{$DOMAIN}{uri} permanent
}

api.{$DOMAIN} {
    reverse_proxy backend:8000
}

storage.{$DOMAIN} {
    reverse_proxy minio:9000
}
```

Caddy mengurus sertifikat HTTPS (Let's Encrypt) otomatis selama domain mengarah ke VM.

## 6. Penyesuaian di repo (sudah disiapkan)

File berikut **sudah ada** di repo — tidak perlu dibuat manual saat deploy:

| File | Status |
|---|---|
| `psd-frontend/next.config.mjs` → `output: "standalone"` | ✅ |
| `psd-frontend/Dockerfile` | ✅ |
| `psd-frontend/.dockerignore` | ✅ |
| `psd-backend/Dockerfile` | ✅ |
| `psd-backend/.dockerignore` | ✅ |
| `deploy/docker-compose.prod.yml` | ✅ |
| `deploy/Caddyfile` | ✅ |
| `deploy/.env.example` + `scripts/init-env.sh` | ✅ |
| `deploy/scripts/deploy.sh` | ✅ |

Detail & perintah cepat: lihat `deploy/README.md`.

> **Penting:** variabel `NEXT_PUBLIC_*` dipanggang saat **build**, bukan saat run. Karena itu di-pass sebagai `args` di compose. Mengubahnya = build ulang frontend.

## 7. DNS

Arahkan dua sub-domain ke IP VM (lewat Cloudflare atau registrar):

```
A   projeksainsdata.com   ->  IP_VM
A   www.projeksainsdata.com   ->  IP_VM
A   api.projeksainsdata.com   ->  IP_VM
A   storage.projeksainsdata.com   ->  IP_VM
```

> Jika pakai Cloudflare, untuk penerbitan sertifikat pertama set mode SSL ke **Full**, atau matikan proxy (abu-abu) sampai Caddy berhasil menerbitkan sertifikat, lalu nyalakan lagi.

## 8. Jalankan & migrasi

```bash
cd ~/psd-web/deploy   # atau ~/psd/deploy
chmod +x scripts/*.sh
./scripts/init-env.sh projeksainsdata.com    # sekali: buat .env dengan rahasia acak
./scripts/deploy.sh             # build, up, alembic upgrade head
```

Atau manual:

```bash
cd ~/psd-web/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
# opsional untuk staging:
docker compose -f docker-compose.prod.yml exec backend python -m app.seed
```

Cek:
- `https://api.projeksainsdata.com/api/v1/health` → `{"status":"ok"}`
- `https://projeksainsdata.com` → aplikasi tampil, menarik data dari `api.projeksainsdata.com`.
- `docker compose -f docker-compose.prod.yml ps` → semua `running`/`healthy`.

## 9. Varian VM lokal (UTM / Multipass di M2)

Untuk uji coba tanpa domain publik:

```bash
# Multipass (paling cepat)
brew install multipass
multipass launch 24.04 --name psd --cpus 2 --memory 4G --disk 40G
multipass shell psd
# di dalam VM: ikuti Bagian 2 (Docker), lalu clone repo
multipass info psd   # catat IP VM
```

Karena tanpa domain, lewati Caddy/TLS. Pakai compose dev (publikasikan port) atau ubah Caddy menjadi akses via IP. Paling sederhana: jalankan backend & frontend dengan port terbuka dan set:
- frontend `.env`/build arg: `NEXT_PUBLIC_API_BASE_URL=http://IP_VM:8000`
- backend `BACKEND_CORS_ORIGINS=["http://IP_VM:3000"]`

Akses via `http://IP_VM:3000`.

## 10. Operasi harian

- **Log:** `docker compose -f docker-compose.prod.yml logs -f backend`
- **Redeploy:** `git pull` di repo terkait, lalu `docker compose -f docker-compose.prod.yml up -d --build` + `alembic upgrade head`.
- **Auto-start saat reboot:** `restart: unless-stopped` sudah menanganinya; Docker hidup otomatis saat boot.
- **MinIO console:** tidak dipublikasikan (aman). Bila perlu, akses sementara via SSH tunnel ke port 9001 setelah mempublikasikannya sementara, atau pakai perintah `mc`.

## 11. Backup

```bash
# Postgres (jadwalkan via cron)
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U psd psd | gzip > ~/backup-$(date +%F).sql.gz
```

Cadangkan juga volume `miniodata` secara berkala.

## 12. Keamanan ringkas

- Rahasia kuat (sudah via `openssl rand`); jangan commit `.env`.
- Hanya 22/80/443 terbuka; database/minio tidak terekspos publik.
- Login SSH pakai kunci, bukan kata sandi (nonaktifkan password login bila bisa).
- Perbarui sistem rutin (`sudo apt upgrade`).
- Token frontend: untuk produksi sungguhan, pindahkan dari `localStorage` ke cookie `httpOnly` (lihat Langkah 9).

## Selesai bila

- [ ] `https://projeksainsdata.com` dan `https://api.projeksainsdata.com` aktif dengan HTTPS valid.
- [ ] Frontend produksi menarik data dari backend nyata (mock mati).
- [ ] Migrasi jalan; (opsional) data seed tampil.
- [ ] Hanya port 22/80/443 terbuka; rahasia tidak ada di git.
- [ ] Redeploy lewat `git pull` + `up -d --build` berfungsi.

> Langkah lanjut (di luar runbook ini): CI/CD otomatis (GitHub Actions: build + SSH deploy saat push), lalu mulai pilot ITERA sesuai peta jalan di Proposal Bisnis & Dokumen Implementasi.
