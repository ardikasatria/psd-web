"""Konten kurasi resmi PSD — idempoten, aman dijalankan berulang."""

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.register_models import register_models
from app.modules.announcements.models import Announcement
from app.modules.categories.models import Category
from app.modules.collections.models import Collection
from app.modules.community.models import Thread
from app.modules.competitions.models import Competition
from app.modules.events.models import Event
from app.modules.learn.models import Course, LearningPath
from app.modules.micro.models import MicroLesson
from app.modules.quests.models import Quest
from app.modules.repos.models import Repo
from app.modules.users.models import User

register_models()

DEMO_PW = hash_password("demo")

def repo_files(repo_id: str) -> list[dict]:
    return [
        {"path": "README.md", "path_key": f"repos/{repo_id}/README.md", "size_bytes": 2048, "type": "markdown"},
        {
            "path": "data/train.csv",
            "path_key": f"repos/{repo_id}/data/train.csv",
            "size_bytes": 15_000_000,
            "type": "csv",
        },
    ]


def dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


async def upsert_user(db, **kwargs) -> User:
    row = (await db.execute(select(User).where(User.id == kwargs["id"]))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = User(**kwargs)
    db.add(row)
    return row


async def upsert_repo(db, repo_id: str, **kwargs) -> Repo:
    slug = kwargs.get("slug")
    row = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
    if not row and slug:
        row = (await db.execute(select(Repo).where(Repo.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Repo(id=repo_id, **kwargs)
    db.add(row)
    return row


async def upsert_competition(db, cmp_id: str, **kwargs) -> Competition:
    slug = kwargs.get("slug")
    row = (await db.execute(select(Competition).where(Competition.id == cmp_id))).scalar_one_or_none()
    if not row and slug:
        row = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Competition(id=cmp_id, **kwargs)
    db.add(row)
    return row


async def upsert_event(db, evt_id: str, **kwargs) -> Event:
    slug = kwargs.get("slug")
    row = (await db.execute(select(Event).where(Event.id == evt_id))).scalar_one_or_none()
    if not row and slug:
        row = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Event(id=evt_id, **kwargs)
    db.add(row)
    return row


async def upsert_course(db, slug: str, **kwargs) -> Course:
    row = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Course(slug=slug, **kwargs)
    db.add(row)
    return row


async def upsert_quest(db, slug: str, **kwargs) -> Quest:
    row = (await db.execute(select(Quest).where(Quest.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Quest(slug=slug, **kwargs)
    db.add(row)
    return row


async def upsert_micro(db, slug: str, **kwargs) -> MicroLesson:
    row = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = MicroLesson(slug=slug, **kwargs)
    db.add(row)
    return row


async def upsert_path(db, slug: str, **kwargs) -> LearningPath:
    row = (await db.execute(select(LearningPath).where(LearningPath.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = LearningPath(slug=slug, **kwargs)
    db.add(row)
    return row


async def upsert_thread(db, thr_id: str, **kwargs) -> Thread:
    row = (await db.execute(select(Thread).where(Thread.id == thr_id))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Thread(id=thr_id, **kwargs)
    db.add(row)
    return row


async def upsert_announcement(db, ann_id: str, **kwargs) -> Announcement:
    row = (await db.execute(select(Announcement).where(Announcement.id == ann_id))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Announcement(id=ann_id, **kwargs)
    db.add(row)
    return row


async def upsert_category(db, cat_id: str, **kwargs) -> Category:
    row = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not row:
        slug = kwargs.get("slug")
        if slug:
            row = (await db.execute(select(Category).where(Category.slug == slug, Category.parent_id.is_(None)))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Category(id=cat_id, **kwargs)
    db.add(row)
    return row


async def upsert_collection(db, col_id: str, **kwargs) -> Collection:
    row = (await db.execute(select(Collection).where(Collection.id == col_id))).scalar_one_or_none()
    if not row:
        slug = kwargs.get("slug")
        if slug:
            row = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if row:
        for k, v in kwargs.items():
            setattr(row, k, v)
        return row
    row = Collection(id=col_id, **kwargs)
    db.add(row)
    return row


async def run():
    async with SessionLocal() as db:
        psd = await upsert_user(
            db,
            id="usr_psd",
            username="psd",
            email="org@psd.id",
            name="Projek Sains Data",
            hashed_password=DEMO_PW,
            role="member",
            account_type="organization",
            is_official=True,
            bio="Akun resmi Projek Sains Data — kurasi dataset, model, dan kompetisi berkonteks Indonesia.",
            created_at=dt("2024-01-01T00:00:00Z"),
        )
        await db.flush()

        await upsert_repo(
            db,
            "ds_01",
            kind="dataset",
            owner_id=psd.id,
            name="ulasan-marketplace-id",
            slug="psd/ulasan-marketplace-id",
            description="200rb ulasan produk berbahasa Indonesia berlabel sentimen.",
            tags=["nlp", "sentimen", "bahasa-indonesia"],
            likes=42,
            downloads=1310,
            featured=True,
            readme_md="# Ulasan Marketplace ID\n\nDataset berisi 200.000 ulasan produk marketplace berbahasa Indonesia.",
            license="CC BY-SA 4.0",
            files=repo_files("ds_01"),
            updated_at=dt("2026-06-20T10:00:00Z"),
        )
        await upsert_repo(
            db,
            "ds_psd_bencana",
            kind="dataset",
            owner_id=psd.id,
            name="bencana-alam-indonesia",
            slug="psd/bencana-alam-indonesia",
            description="Data kejadian bencana alam di Indonesia untuk analisis risiko.",
            tags=["bencana", "geospasial", "pemerintah"],
            likes=28,
            downloads=540,
            featured=True,
            readme_md="# Bencana Alam Indonesia\n\nKumpulan data kejadian bencana dari sumber terbuka.",
            license="CC BY 4.0",
            files=repo_files("ds_psd_bencana"),
            updated_at=dt("2026-06-18T10:00:00Z"),
        )
        await upsert_repo(
            db,
            "mdl_01",
            kind="model",
            owner_id=psd.id,
            name="indobert-sentimen",
            slug="psd/indobert-sentimen",
            description="Model klasifikasi sentimen berbasis IndoBERT untuk teks Indonesia.",
            tags=["nlp", "sentimen", "transformer"],
            likes=87,
            downloads=2340,
            featured=True,
            readme_md="# IndoBERT Sentimen\n\nModel fine-tuned untuk ulasan berbahasa Indonesia.",
            license="Apache-2.0",
            files=repo_files("mdl_01"),
            updated_at=dt("2026-06-17T10:00:00Z"),
        )
        await upsert_repo(
            db,
            "prj_psd_pipeline",
            kind="project",
            owner_id=psd.id,
            name="contoh-pipeline-umkm",
            slug="psd/contoh-pipeline-umkm",
            description="Contoh pipeline ETL hingga dashboard untuk data UMKM.",
            tags=["umkm", "visualisasi", "contoh"],
            likes=34,
            downloads=210,
            featured=False,
            readme_md="# Contoh Pipeline UMKM\n\nProyek referensi bagi pemula.",
            license="MIT",
            files=repo_files("prj_psd_pipeline"),
            updated_at=dt("2026-06-15T10:00:00Z"),
        )

        await upsert_competition(
            db,
            "cmp_01",
            slug="prediksi-permintaan-umkm",
            title="Prediksi Permintaan Produk UMKM",
            sponsor="Dinas Koperasi & UMKM Lampung",
            status="active",
            metric="RMSLE",
            participants=128,
            prize_pool="Rp15.000.000",
            starts_at=dt("2026-06-01T00:00:00Z"),
            ends_at=dt("2026-07-15T23:59:00Z"),
            featured=True,
            overview_md="Bangun model peramalan permintaan mingguan untuk UMKM binaan.",
            rules_md="Maksimal 5 submission per hari per peserta.",
            dataset_info_md="Data penjualan historis 18 bulan, anonim per UMKM.",
            prizes=[{"rank": 1, "reward": "Rp8.000.000"}],
            tags=["forecasting", "umkm"],
        )

        await upsert_event(
            db,
            "evt_01",
            slug="demo-day-sains-data-itera",
            title="Demo Day Sains Data ITERA",
            type="demo_day",
            mode="luring",
            status="upcoming",
            starts_at=dt("2026-07-10T08:00:00Z"),
            ends_at=dt("2026-07-10T17:00:00Z"),
            location="Gedung Auditorium ITERA, Lampung Selatan",
            capacity=200,
            featured=True,
            description_md="Showcase proyek sains data mahasiswa dan komunitas ITERA.",
            agenda=[{"time": "09:00", "title": "Pembukaan & keynote"}],
            speakers=[{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}],
        )

        await upsert_course(
            db,
            "pengantar-sains-data",
            title="Pengantar Sains Data",
            level="pemula",
            description="Pelajari konsep dasar sains data dari nol hingga analisis pertama.",
            modules=[
                {
                    "title": "Memulai",
                    "lessons": [
                        {"id": "l1", "title": "Apa itu sains data?", "duration_min": 12},
                        {"id": "l2", "title": "Alat & ekosistem PSD", "duration_min": 18},
                    ],
                }
            ],
        )
        await upsert_path(
            db,
            "jalur-pemula",
            title="Jalur Pemula Sains Data",
            description="Jalur terstruktur untuk pendatang baru di PSD.",
            course_slugs=["pengantar-sains-data"],
        )

        await upsert_quest(
            db,
            "mulai-perjalanan",
            title="Mulai Perjalanan Sains Data",
            description="Quest pembuka yang memandu Anda melalui lingkaran PSD: belajar, buktikan, dan berkontribusi.",
            steps=[
                {
                    "id": "profil",
                    "title": "Lengkapi profil",
                    "type": "complete_profile",
                    "description": "Tambahkan foto dan bio agar komunitas mengenal Anda.",
                },
                {
                    "id": "belajar",
                    "title": "Selesaikan course pertama",
                    "type": "complete_course",
                    "target": "pengantar-sains-data",
                    "description": "Tuntaskan semua pelajaran di Pengantar Sains Data.",
                },
                {
                    "id": "buktikan",
                    "title": "Submission kompetisi",
                    "type": "submit_competition",
                    "description": "Kirim submission yang dinilai di kompetisi mana pun.",
                },
                {
                    "id": "kontribusi",
                    "title": "Terbitkan aset pertama",
                    "type": "publish_asset",
                    "description": "Buat proyek, dataset, atau model di portofolio Anda.",
                },
            ],
            reward_reputation=30,
            reward_badge="langkah-pertama",
            active=True,
        )
        await upsert_quest(
            db,
            "jalin-komunitas",
            title="Jalin Komunitas",
            description="Perluas jaringan dan bagikan progres Anda.",
            steps=[
                {
                    "id": "follow",
                    "title": "Ikuti seorang praktisi",
                    "type": "follow_user",
                    "description": "Temukan dan ikuti anggota komunitas lain.",
                },
                {
                    "id": "post",
                    "title": "Bagikan ke feed",
                    "type": "make_post",
                    "description": "Posting pembaruan atau insight di feed komunitas.",
                },
                {
                    "id": "notebook",
                    "title": "Bagikan notebook",
                    "type": "create_notebook",
                    "description": "Tautkan notebook referensi untuk orang lain.",
                },
            ],
            reward_reputation=20,
            reward_badge="terhubung",
            active=True,
        )
        await upsert_quest(
            db,
            "aktif-di-forum",
            title="Aktif di Forum",
            description="Berkontribusi di forum diskusi terstruktur PSD.",
            steps=[
                {
                    "id": "thread",
                    "title": "Buka topik baru",
                    "type": "make_thread",
                    "description": "Mulai diskusi di forum dengan topik yang jelas.",
                },
                {
                    "id": "reply",
                    "title": "Balas diskusi",
                    "type": "reply_thread",
                    "description": "Bantu sesama dengan menjawab atau menanggapi utas.",
                },
            ],
            reward_reputation=15,
            reward_badge=None,
            active=True,
        )

        await upsert_micro(
            db,
            "apa-itu-dataframe",
            title="Apa itu DataFrame?",
            content_md=(
                "## Konsep singkat\n\n"
                "DataFrame adalah struktur data tabular — seperti spreadsheet — yang paling sering dipakai di pandas.\n\n"
                "**Baris** biasanya merepresentasikan observasi, **kolom** merepresentasikan variabel."
            ),
            duration_min=5,
            category_id="cat_tab",
            quiz=[
                {
                    "id": "q1",
                    "question": "Apa yang biasanya direpresentasikan oleh baris dalam DataFrame?",
                    "options": ["Variabel", "Observasi", "Indeks waktu", "Header"],
                    "answer_index": 1,
                    "explanation": "Setiap baris umumnya adalah satu observasi atau record.",
                }
            ],
            active=True,
        )
        await upsert_micro(
            db,
            "visualisasi-cepat",
            title="Visualisasi cepat dengan matplotlib",
            content_md=(
                "## Mulai dari plot sederhana\n\n"
                "Gunakan `plt.plot()` untuk garis dan `plt.bar()` untuk batang. "
                "Selalu beri label sumbu agar grafik mudah dibaca."
            ),
            duration_min=4,
            category_id="cat_cv",
            quiz=[],
            active=True,
        )
        await upsert_micro(
            db,
            "etika-data-umkm",
            title="Etika data untuk UMKM",
            content_md=(
                "## Privasi pelanggan\n\n"
                "Jangan publikasikan data transaksi mentah yang bisa mengidentifikasi pelanggan. "
                "Anonimkan atau agregasi sebelum dibagikan."
            ),
            duration_min=3,
            category_id="cat_umkm",
            quiz=[],
            active=True,
        )
        await upsert_micro(
            db,
            "tokenisasi-teks",
            title="Tokenisasi teks dasar",
            content_md=(
                "## Memecah kalimat\n\n"
                "Tokenisasi memecah teks menjadi unit kecil (token) — kata atau subkata — "
                "sebelum analisis NLP lebih lanjut."
            ),
            duration_min=5,
            category_id="cat_nlp",
            quiz=[
                {
                    "id": "q1",
                    "question": "Apa tujuan utama tokenisasi?",
                    "options": [
                        "Mengompres file",
                        "Memecah teks menjadi unit analisis",
                        "Menghapus stopword",
                        "Melatih model gambar",
                    ],
                    "answer_index": 1,
                    "explanation": "Tokenisasi menyiapkan teks untuk pemrosesan berikutnya.",
                }
            ],
            active=True,
        )

        now = dt("2026-06-25T10:00:00Z")
        await upsert_thread(
            db,
            "thr_welcome",
            title="Selamat datang di PSD",
            author_id=psd.id,
            body_md="Selamat datang di Projek Sains Data! Platform ini menghubungkan praktisi, mahasiswa, dan UMKM.",
            tags=["pengumuman", "pemula"],
            created_at=now,
            last_activity_at=now,
        )
        await upsert_thread(
            db,
            "thr_guidelines",
            title="Pedoman Komunitas",
            author_id=psd.id,
            body_md="Hormati sesama anggota, sertakan lisensi data, dan jangan bagikan data sensitif tanpa izin.",
            tags=["komunitas", "pedoman"],
            created_at=now,
            last_activity_at=now,
        )
        await upsert_thread(
            db,
            "thr_faq",
            title="FAQ",
            author_id=psd.id,
            body_md="**Bagaimana cara upload dataset?** Buat aset baru dari menu Proyek/Dataset.\n\n**Apakah gratis?** Ya, untuk fase pilot.",
            tags=["faq", "bantuan"],
            created_at=now,
            last_activity_at=now,
        )

        await upsert_announcement(
            db,
            "ann_demo_day",
            title="Pendaftaran Demo Day ITERA dibuka",
            body_md="Daftar sekarang untuk menampilkan proyek sains data Anda di Demo Day ITERA, 10 Juli 2026.",
            level="penting",
            active=True,
        )
        await upsert_announcement(
            db,
            "ann_welcome",
            title="Selamat datang di pilot PSD",
            body_md="Eksplorasi dataset, model, dan kompetisi kurasi tim PSD. Butuh bantuan? Kunjungi halaman /help.",
            level="info",
            active=True,
        )

        humas = (await db.execute(select(User).where(User.role.in_(["moderator", "superadmin"]))).scalars().first()
        staff_id = humas.id if humas else psd.id

        await upsert_category(
            db,
            "cat_transformer",
            slug="transformer",
            name="Transformer",
            description="Model, dataset, dan notebook bertema Transformer dengan konteks Indonesia.",
            parent_id=None,
        )
        await upsert_collection(
            db,
            "col_model_bahasa_id",
            slug="model-bahasa-indonesia",
            title="Model Bahasa Indonesia",
            description_md="Koleksi kurasi model Transformer untuk teks berbahasa Indonesia — sentimen, klasifikasi, dan embedding.",
            cover_url=None,
            owner_id=staff_id,
            category_id="cat_transformer",
            is_featured=True,
            items=[{"type": "model", "slug": "psd/indobert-sentimen"}],
        )
        await upsert_collection(
            db,
            "col_notebook_finetune",
            slug="notebook-fine-tuning-hemat",
            title="Notebook Fine-tuning Hemat",
            description_md="Notebook referensi fine-tuning model bahasa dengan resource terbatas — cocok untuk pemula dan UMKM.",
            cover_url=None,
            owner_id=staff_id,
            category_id="cat_transformer",
            is_featured=True,
            items=[
                {"type": "model", "slug": "psd/indobert-sentimen"},
                {"type": "dataset", "slug": "psd/ulasan-marketplace-id"},
            ],
        )

        await db.commit()
        print("seed_content selesai.")


if __name__ == "__main__":
    asyncio.run(run())
