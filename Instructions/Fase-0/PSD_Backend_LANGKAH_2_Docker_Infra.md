# Langkah 2 — Docker Compose & Infrastruktur

> **Tujuan:** Seluruh stack Fase 0 (backend + PostgreSQL + Redis + MinIO) berjalan via Docker Compose. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 1 selesai.

## 2.1 `Dockerfile` (di root `psd-backend/`)

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 2.2 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: psd
      POSTGRES_PASSWORD: psd
      POSTGRES_DB: psd
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U psd"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: psd
      MINIO_ROOT_PASSWORD: psd-secret
    ports: ["9000:9000", "9001:9001"]   # 9000 API, 9001 console
    volumes: ["miniodata:/data"]
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 psd psd-secret &&
      mc mb -p local/psd-assets || true &&
      mc anonymous set download local/psd-assets || true
      "

  backend:
    build: .
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://psd:psd@db:5432/psd
      REDIS_URL: redis://redis:6379/0
      BACKEND_CORS_ORIGINS: '["http://localhost:3000"]'
      JWT_SECRET: ganti-di-produksi
    ports: ["8000:8000"]
    volumes: ["./:/code"]   # hot-reload saat dev
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  pgdata:
  miniodata:
```

> **Catatan:** frontend Next.js **tidak** dimasukkan ke compose ini — Anda tetap menjalankannya dari Cursor/lokal. Arahkan `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. Meilisearch & Gitea menyusul pada langkah pengerasan, agar Fase 0 tetap ramping.

## 2.3 Jalankan

```bash
docker compose up -d --build
docker compose ps           # semua service "running"/"healthy"
curl http://localhost:8000/api/v1/health     # {"status":"ok"}
```

Akses:
- API: `http://localhost:8000`  · Docs: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001` (user `psd`, pass `psd-secret`) — bucket `psd-assets` sudah dibuat.
- Postgres: `localhost:5432` (db `psd`, user `psd`, pass `psd`).

## Selesai bila

- [ ] `docker compose ps` menampilkan `db`, `redis`, `minio` *healthy* dan `backend` *running*.
- [ ] Health endpoint menjawab dari dalam container.
- [ ] Bucket `psd-assets` muncul di MinIO console.
- [ ] Perubahan kode lokal langsung ter-reload (volume mount aktif).
