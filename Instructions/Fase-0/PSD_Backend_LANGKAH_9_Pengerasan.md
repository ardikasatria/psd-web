# Langkah 9 — Pengerasan (Search, Unggah File, Logging, Test)

> **Tujuan:** Mengubah MVP yang berjalan menjadi lebih siap pakai: pencarian nyata, unggah file ke MinIO, logging, dan test dasar. **Kerjakan per bagian, tidak harus sekaligus.** Prasyarat: Langkah 8 (platform hidup end-to-end).

Setiap bagian di bawah berdiri sendiri — ambil sesuai kebutuhan.

## 9.1 Pencarian (Meilisearch)

Tambah service di `docker-compose.yml`:

```yaml
  meilisearch:
    image: getmeili/meilisearch:v1.8
    environment:
      MEILI_MASTER_KEY: psd-search-key
    ports: ["7700:7700"]
    volumes: ["meilidata:/meili_data"]
```

(tambahkan `meilidata:` ke `volumes:` di bawah).

- Dependensi: `meilisearch` (Python client).
- Pola: saat repo/kompetisi dibuat atau di-seed, **indeks** dokumen ke Meilisearch (lewat worker/sinkron sederhana). Endpoint list memakai Meilisearch saat ada `q`, dan Postgres untuk daftar biasa.
- Untuk Fase awal, cukup indeks `repos` dan `competitions` (field: title/name, description, tags).

> Sampai ini stabil, pencarian `ilike` dari Postgres (Langkah 5–7) sudah cukup. Aktifkan Meilisearch ketika volume data membesar.

## 9.2 Unggah File ke MinIO

- Dependensi: `minio` (atau `boto3`).
- Helper penyimpanan — `app/core/storage.py`:

```python
from minio import Minio
from app.core.config import settings

# tambahkan ke config: MINIO_ENDPOINT, MINIO_KEY, MINIO_SECRET, MINIO_BUCKET="psd-assets"
client = Minio(settings.MINIO_ENDPOINT, access_key=settings.MINIO_KEY,
               secret_key=settings.MINIO_SECRET, secure=False)


def put_object(key: str, data, length: int, content_type: str) -> str:
    client.put_object(settings.MINIO_BUCKET, key, data, length, content_type=content_type)
    return f"/{settings.MINIO_BUCKET}/{key}"
```

- Gunakan pada: file submission kompetisi (Langkah 6, ganti "simpan metadata" menjadi unggah nyata), dan file aset repo.
- Untuk file besar, pertimbangkan **presigned URL** agar klien mengunggah langsung ke MinIO tanpa melewati backend.

## 9.3 Logging & Error Tracking

- Konfigurasi logging terstruktur (JSON) + **request ID** per permintaan (middleware).
- Opsional: **Sentry** untuk error tracking — `sentry-sdk[fastapi]`, inisialisasi di `main.py` dengan DSN dari env.
- Endpoint health (`/health`, `/health/db`) sudah ada untuk pemantauan.

## 9.4 Test Dasar

- Dependensi: `pytest`, `pytest-asyncio`, `httpx`.
- Pakai database test terpisah (atau SQLite untuk smoke test cepat).
- Contoh smoke test — `tests/test_smoke.py`:

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/v1/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}
```

- Tambah test alur kunci: register → login → akses `me`; list & detail tiap resource; submit kompetisi.

## 9.5 Catatan Menuju Produksi

- **Rahasia:** `JWT_SECRET`, kredensial DB/MinIO dari secret manager, bukan default.
- **Token:** pindahkan dari `localStorage` (demo) ke cookie `httpOnly`; siapkan jalur SSO Keycloak (Fase 2).
- **Uvicorn:** jalankan dengan beberapa worker (mis. via Gunicorn + worker Uvicorn) di produksi; hapus `--reload`.
- **Migrasi:** jalankan `alembic upgrade head` sebagai langkah deploy, bukan manual.
- **Rate limit & CORS:** ketatkan origin; tambahkan rate limit (mis. via Redis) untuk endpoint submission & auth.
- **Backup:** jadwalkan backup volume Postgres & MinIO.

## Selesai bila (per bagian yang dikerjakan)

- [ ] Pencarian `q` mengembalikan hasil dari Meilisearch (jika diaktifkan).
- [ ] Submission/aset benar-benar terunggah ke bucket `psd-assets`.
- [ ] Log memuat request ID; (opsional) error terkirim ke Sentry.
- [ ] `pytest` hijau untuk smoke test + alur auth.
- [ ] Checklist produksi ditinjau sebelum deploy ke VM/server.

> Ini menutup rangkaian Fase 0 backend. Tahap berikutnya (di luar daftar ini) adalah **deploy ke VM/server** dan mulai pilot ITERA sesuai peta jalan di Proposal Bisnis & Dokumen Implementasi.
