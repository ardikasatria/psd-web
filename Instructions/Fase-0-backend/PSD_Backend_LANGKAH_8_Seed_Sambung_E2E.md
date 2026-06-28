# Langkah 8 — Seed Data + Sambung Frontend + Uji E2E

> **Tujuan:** Isi database dengan data demo **yang sama** seperti mock frontend, lalu flip frontend dari mock ke API nyata dan uji end-to-end. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7.

## 8.1 Prinsip seed

Gunakan **data yang identik** dengan `lib/mocks/data/*` di frontend. Tujuannya: setelah flip, tampilan tidak berubah — yang berbeda hanya sumber datanya. Ini sekaligus membuktikan kontrak FE↔BE benar-benar cocok.

## 8.2 Skrip seed — `app/seed.py`

Idempoten: kosongkan lalu isi ulang. Tambahkan entri secukupnya (≈8–12 per daftar, 1–2 detail lengkap, leaderboard ≈20 baris).

```python
import asyncio
from datetime import datetime, timezone
from sqlalchemy import delete
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.modules.users.models import User
from app.modules.repos.models import Repo
from app.modules.competitions.models import Competition, LeaderboardRow
from app.modules.events.models import Event
from app.modules.learn.models import Course, LearningPath, Notebook
from app.modules.community.models import Thread

NOW = datetime(2026, 6, 24, tzinfo=timezone.utc)


async def run():
    async with SessionLocal() as db:
        # 1) bersihkan (urutan aman terhadap FK)
        for model in (LeaderboardRow, Thread, Repo, Competition, Event, Course, LearningPath, Notebook, User):
            await db.execute(delete(model))

        # 2) users
        psd = User(id="usr_psd", username="psd", email="org@psd.id", name="Projek Sains Data",
                   hashed_password=hash_password("demo"), role="org_admin")
        satria = User(id="usr_satria", username="satria", email="satria@psd.id", name="Satria",
                      hashed_password=hash_password("demo"))
        db.add_all([psd, satria])

        # 3) datasets / models / projects (samakan dengan mock frontend)
        db.add(Repo(id="repo_ds1", kind="dataset", owner_id="psd".rjust(0) or psd.id,
                    name="ulasan-marketplace-id", slug="psd/ulasan-marketplace-id",
                    description="200rb ulasan produk berbahasa Indonesia berlabel sentimen.",
                    tags=["nlp", "sentimen", "bahasa-indonesia"], likes=42, downloads=1310,
                    readme_md="# Ulasan Marketplace ID\n...", updated_at=NOW))

        # 4) competition + leaderboard
        cmp = Competition(id="cmp_umkm", slug="prediksi-permintaan-umkm",
                          title="Prediksi Permintaan Produk UMKM",
                          sponsor="Dinas Koperasi & UMKM Lampung", status="active", metric="RMSLE",
                          participants=128, prize_pool="Rp15.000.000",
                          starts_at=NOW, ends_at=NOW, cover_url=None,
                          overview_md="Bangun model peramalan permintaan mingguan...",
                          rules_md="Maksimal 5 submission/hari.", dataset_info_md="Data 18 bulan, anonim.",
                          prizes=[{"rank": 1, "reward": "Rp8.000.000 + peluang rekrutmen"}],
                          tags=["forecasting", "umkm", "tabular"])
        db.add(cmp)
        db.add_all([LeaderboardRow(competition_id="cmp_umkm", board="public", rank=i + 1,
                                   participant_username=f"peserta{i+1}", score=0.40 + i * 0.005,
                                   submitted_at=NOW) for i in range(20)])

        # 5) event
        db.add(Event(slug="demo-day-sains-data-itera", title="Demo Day Sains Data ITERA",
                     type="demo_day", mode="luring", status="upcoming", starts_at=NOW, ends_at=NOW,
                     location="ITERA, Lampung Selatan", capacity=120,
                     description_md="Pertemuan talenta & UMKM.", agenda=[{"time": "09:00", "title": "Pembukaan"}],
                     speakers=[{"name": "Satria", "title": "Dosen Sains Data", "avatar_url": None}]))

        # 6) course / path / notebook / thread — tambahkan beberapa entri serupa
        db.add(Course(slug="pengantar-analisis-big-data", title="Pengantar Analisis Big Data",
                      level="pemula", description="Dasar-dasar big data.",
                      modules=[{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Apa itu Big Data",
                                                                  "duration_min": 12}]}]))

        await db.commit()
        print("Seed selesai.")


if __name__ == "__main__":
    asyncio.run(run())
```

> Lengkapi entri agar setiap daftar punya cukup item. Pastikan setiap nilai cocok dengan skema kontrak (validasi balik dengan menjalankan endpointnya).

Jalankan:

```bash
docker compose exec backend python -m app.seed
```

## 8.3 Sambungkan frontend

Di repo frontend (`psd-frontend/`), ubah `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false
```

Pastikan MSW **tidak** aktif saat `NEXT_PUBLIC_USE_MOCKS=false`, lalu jalankan ulang `npm run dev`.

## 8.4 Uji End-to-End

- [ ] Beranda menarik proyek/kompetisi/event dari API nyata.
- [ ] Halaman list & detail (projects, datasets, models, competitions, events, courses, forum, profil) tampil dari backend.
- [ ] Login (`satria@psd.id` / `demo`) berhasil; `me` mengembalikan profil; halaman ber-auth bisa diakses.
- [ ] Submit ke kompetisi mengembalikan submission `queued`; daftar event mencatat registrasi.
- [ ] Validasi Zod di frontend **tidak** melempar error (artinya bentuk respons cocok kontrak).

## 8.5 Bila ada masalah

- **CORS error** → pastikan origin frontend ada di `BACKEND_CORS_ORIGINS`.
- **Zod gagal parse** → bandingkan field respons dengan skema; samakan nama/tipe (snake_case).
- **401 tak terduga** → cek header `Authorization: Bearer` dikirim & token tersimpan.

## Selesai bila

- [ ] Frontend berjalan penuh dengan `NEXT_PUBLIC_USE_MOCKS=false` tanpa perubahan kode komponen.
- [ ] Semua halaman P0 tampil benar dari backend nyata.
- [ ] Tidak ada error Zod/CORS/401 yang belum terselesaikan.

> Platform Fase 0 kini **hidup end-to-end**. Lanjut ke **Langkah 9 — Pengerasan** saat siap menambah pencarian, unggah file, logging, dan test.
