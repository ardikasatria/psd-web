import asyncio
from datetime import datetime, timezone

from sqlalchemy import delete, update

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.register_models import register_models
from app.mlops.models import DriftReport, ModelRegistry, ModelVersion
from app.modules.activity.models import ActivityEvent
from app.modules.announcements.models import Announcement
from app.modules.blog.models import BlogPost
from app.modules.categories.models import Category
from app.modules.collections.models import Collection
from app.modules.community.models import ForumReaction, ForumVote, Post as ForumPost, Thread
from app.modules.competitions.models import (
    Competition,
    CompetitionProposal,
    LeaderboardRow,
    Submission,
)
from app.modules.events.models import Event, EventProposal, EventRegistration
from app.modules.factory.models import Dashboard, DataSource, Pipeline, PipelineRun, Widget
from app.modules.gamification.models import UserBadge
from app.modules.instructors.models import InstructorApplication
from app.modules.learn.models import Course, Enrollment, LearningPath, LessonProgress, Notebook
from app.modules.micro.models import MicroCompletion, MicroLesson
from app.modules.notifications.models import Notification
from app.modules.quests.models import Quest, QuestClaim
from app.modules.repos.models import Repo, RepoLike
from app.modules.rooms.models import IdeaRoom, ProblemComponent, RoomProblem, RoomSubmission
from app.modules.social.models import Follow, Post as SocialPost, PostComment as SocialPostComment, PostLike as SocialPostLike
from app.modules.synthesis.models import SynthesisJob
from app.modules.teams.models import Team, TeamInvite, TeamJoinRequest, TeamMember
from app.modules.users.models import User

register_models()

DEMO_PW = hash_password("demo")


def dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def repo_files(repo_id: str) -> list[dict]:
    """path_key wajib untuk DuckDB/MinIO (Langkah 45 §45.4)."""
    return [
        {"path": "README.md", "path_key": f"repos/{repo_id}/README.md", "size_bytes": 2048, "type": "markdown"},
        {
            "path": "data/train.csv",
            "path_key": f"repos/{repo_id}/data/train.csv",
            "size_bytes": 15_000_000,
            "type": "csv",
        },
        {
            "path": "data/test.csv",
            "path_key": f"repos/{repo_id}/data/test.csv",
            "size_bytes": 3_000_000,
            "type": "csv",
        },
    ]

LEADERBOARD_NAMES = [
    "budi-santoso", "siti-rahayu", "data-wizard", "ml-lampung", "forecast-pro",
    "umkm-analytics", "itera-team", "ds-beginner", "tabular-king", "lstm-master",
    "feature-eng", "baseline-hero", "ensemble-guru", "cv-expert", "nlp-ninja",
    "stats-savvy", "pandas-pro", "sklearn-star", "torch-titan", "xgboost-x",
]

# Anak dulu, induk belakangan — aman dijalankan ulang setelah seed_content / Fase 1.
SEED_WIPE_ORDER = (
    DriftReport,
    ModelVersion,
    ModelRegistry,
    Widget,
    Dashboard,
    PipelineRun,
    Pipeline,
    DataSource,
    SynthesisJob,
    MicroCompletion,
    QuestClaim,
    LessonProgress,
    Enrollment,
    InstructorApplication,
    Submission,
    LeaderboardRow,
    CompetitionProposal,
    EventProposal,
    ForumReaction,
    ForumVote,
    ForumPost,
    Thread,
    EventRegistration,
    SocialPostComment,
    SocialPostLike,
    SocialPost,
    Follow,
    UserBadge,
    Notification,
    BlogPost,
    Announcement,
    ActivityEvent,
    RoomSubmission,
    ProblemComponent,
    RoomProblem,
    RepoLike,
    Repo,
    Competition,
    Event,
    Course,
    LearningPath,
    Notebook,
    IdeaRoom,
    MicroLesson,
    Collection,
    Quest,
    TeamJoinRequest,
    TeamInvite,
    TeamMember,
    Team,
    Category,
    User,
)


async def run():
    async with SessionLocal() as db:
        for model in SEED_WIPE_ORDER:
            if model is Category:
                await db.execute(update(Category).values(parent_id=None))
            await db.execute(delete(model))

        users = [
            User(id="usr_01", username="budi-santoso", email="budi@psd.id", name="Budi Santoso",
                 hashed_password=DEMO_PW, bio="Data scientist berbasis Lampung. Fokus NLP bahasa Indonesia.",
                 role="member", created_at=dt("2025-03-10T08:00:00Z")),
            User(id="usr_02", username="siti-rahayu", email="siti@psd.id", name="Siti Rahayu",
                 hashed_password=DEMO_PW, bio="Mahasiswa ITERA, minat computer vision untuk pertanian.",
                 role="member", created_at=dt("2025-05-22T10:30:00Z")),
            User(id="usr_03", username="admin-psd", email="admin@psd.id", name="Admin PSD",
                 hashed_password=DEMO_PW, bio="Tim pengelola Projek Sains Data.",
                 role="superadmin", created_at=dt("2024-12-01T00:00:00Z")),
            User(id="usr_psd", username="psd", email="org@psd.id", name="Projek Sains Data",
                 hashed_password=DEMO_PW, role="member", account_type="organization", is_official=True,
                 created_at=dt("2024-01-01T00:00:00Z")),
            User(id="usr_itera", username="itera-ds", email="itera@psd.id", name="ITERA Data Science",
                 hashed_password=DEMO_PW, role="member", account_type="organization", created_at=dt("2024-06-01T00:00:00Z")),
            User(id="usr_lampung", username="umkm-lampung", email="umkm@psd.id", name="UMKM Lampung",
                 hashed_password=DEMO_PW, role="member", account_type="organization", created_at=dt("2024-06-01T00:00:00Z")),
            User(id="usr_satria", username="satria", email="satria@psd.id", name="Satria",
                 hashed_password=DEMO_PW, role="superadmin", created_at=dt("2025-01-15T00:00:00Z")),
        ]
        db.add_all(users)
        await db.flush()
        uid = {u.username: u.id for u in users}

        mains = [
            Category(id="cat_nlp", slug="nlp", name="NLP & Bahasa", description="Pemrosesan bahasa alami dan teks."),
            Category(id="cat_cv", slug="computer-vision", name="Computer Vision", description="Penglihatan komputer dan citra."),
            Category(id="cat_tab", slug="tabular", name="Tabular & Forecasting", description="Data tabular dan peramalan."),
            Category(id="cat_umkm", slug="umkm", name="UMKM & Ekonomi", description="Aplikasi sains data untuk UMKM."),
            Category(
                id="cat_transformer",
                slug="transformer",
                name="Transformer",
                description="Model, dataset, dan notebook bertema Transformer dengan konteks Indonesia.",
            ),
        ]
        subs = [
            Category(id="cat_sub_sentimen", slug="sentimen", name="Sentimen", parent_id="cat_nlp"),
            Category(id="cat_sub_chatbot", slug="chatbot", name="Chatbot", parent_id="cat_nlp"),
            Category(id="cat_sub_disease", slug="deteksi-penyakit", name="Deteksi Penyakit", parent_id="cat_cv"),
            Category(id="cat_sub_forecast", slug="forecasting", name="Forecasting", parent_id="cat_tab"),
            Category(id="cat_sub_demand", slug="permintaan", name="Permintaan Produk", parent_id="cat_umkm"),
        ]
        db.add_all(mains + subs)
        await db.flush()

        repos_data = [
            ("ds_01", "dataset", "psd", "ulasan-marketplace-id", "psd/ulasan-marketplace-id",
             "200rb ulasan produk berbahasa Indonesia berlabel sentimen.",
             ["nlp", "sentimen", "bahasa-indonesia"], 42, 1310, "2026-06-20T10:00:00Z",
             "# Ulasan Marketplace Indonesia\n\nDataset berisi 200.000 ulasan produk.", None),
            ("mdl_01", "model", "psd", "indobert-sentimen", "psd/indobert-sentimen",
             "Model klasifikasi sentimen berbasis IndoBERT untuk teks Indonesia.",
             ["nlp", "sentimen", "transformer"], 87, 2340, "2026-06-18T14:30:00Z",
             "# IndoBERT Sentimen\n\nModel fine-tuned IndoBERT.", {"accuracy": 0.912, "f1": 0.89}),
            ("prj_01", "project", "budi-santoso", "analisis-umkm-lampung", "budi-santoso/analisis-umkm-lampung",
             "Pipeline analisis data penjualan UMKM binaan Dinas Koperasi Lampung.",
             ["umkm", "forecasting", "tabular"], 23, 156, "2026-06-15T09:00:00Z",
             "# Analisis UMKM Lampung\n\nProyek end-to-end ETL hingga dashboard.", None),
            ("ds_02", "dataset", "itera-ds", "citra-padi-sumsel", "itera-ds/citra-padi-sumsel",
             "5.000 citra daun padi Sumatera Selatan untuk deteksi penyakit.",
             ["computer-vision", "pertanian", "padi"], 31, 890, "2026-06-12T11:00:00Z",
             "# Citra Padi Sumsel\n\nDataset citra daun padi.", None),
            ("mdl_02", "model", "siti-rahayu", "klasifikasi-penyakit-padi", "siti-rahayu/klasifikasi-penyakit-padi",
             "Model CNN ringan untuk klasifikasi 4 jenis penyakit padi.",
             ["computer-vision", "pertanian", "cnn"], 19, 412, "2026-06-10T16:00:00Z",
             "# Klasifikasi Penyakit Padi\n\nModel CNN ringan.", {"accuracy": 0.88}),
            ("prj_02", "project", "psd", "dashboard-umkm-nasional", "psd/dashboard-umkm-nasional",
             "Dashboard interaktif visualisasi kinerja UMKM di 10 provinsi.",
             ["visualisasi", "umkm", "dashboard"], 56, 278, "2026-06-08T08:00:00Z",
             "# Dashboard UMKM Nasional\n\nDashboard interaktif.", None),
            ("ds_03", "dataset", "umkm-lampung", "penjualan-harian-2024", "umkm-lampung/penjualan-harian-2024",
             "Data penjualan harian 200 UMKM binaan, 18 bulan historis.",
             ["umkm", "forecasting", "tabular"], 15, 620, "2026-06-05T12:00:00Z",
             "# Penjualan Harian 2024\n\nData penjualan UMKM.", None),
            ("mdl_03", "model", "budi-santoso", "forecast-umkm-lstm", "budi-santoso/forecast-umkm-lstm",
             "Model LSTM untuk peramalan permintaan mingguan produk UMKM.",
             ["forecasting", "lstm", "umkm"], 28, 345, "2026-06-03T10:00:00Z",
             "# Forecast UMKM LSTM\n\nModel LSTM.", {"mae": 0.12}),
            ("prj_03", "project", "itera-ds", "chatbot-bahasa-lampung", "itera-ds/chatbot-bahasa-lampung",
             "Chatbot edukasi sains data dengan dukungan dialek Lampung.",
             ["nlp", "chatbot", "bahasa-daerah"], 44, 198, "2026-05-28T14:00:00Z",
             "# Chatbot Bahasa Lampung\n\nChatbot edukasi.", None),
            ("ds_04", "dataset", "psd", "survei-digital-umkm-2025", "psd/survei-digital-umkm-2025",
             "Hasil survei adopsi teknologi digital pada 1.500 UMKM Indonesia.",
             ["umkm", "survei", "digitalisasi"], 37, 720, "2026-05-25T09:00:00Z",
             "# Survei Digital UMKM 2025\n\nHasil survei adopsi teknologi.", None),
        ]
        for rid, kind, owner, name, slug, desc, tags, likes, downloads, updated, readme, metrics in repos_data:
            owner_key = owner
            cat_id = sub_id = None
            if "transformer" in tags:
                cat_id = "cat_transformer"
            elif "nlp" in tags or "sentimen" in tags:
                cat_id, sub_id = "cat_nlp", "cat_sub_sentimen" if "sentimen" in tags else None
            elif "computer-vision" in tags or "pertanian" in tags:
                cat_id, sub_id = "cat_cv", "cat_sub_disease" if "pertanian" in tags else None
            elif "forecasting" in tags or "umkm" in tags:
                cat_id = "cat_umkm" if "umkm" in tags else "cat_tab"
                sub_id = "cat_sub_demand" if "umkm" in tags else "cat_sub_forecast"
            db.add(Repo(
                id=rid, kind=kind, owner_id=uid[owner_key], name=name, slug=slug,
                description=desc, tags=tags, likes=likes, downloads=downloads,
                readme_md=readme, license="CC BY-SA 4.0", files=repo_files(rid),
                metrics=metrics, updated_at=dt(updated),
                category_id=cat_id, subcategory_id=sub_id,
            ))

        competitions = [
            Competition(id="cmp_01", slug="prediksi-permintaan-umkm", title="Prediksi Permintaan Produk UMKM",
                        sponsor="Dinas Koperasi & UMKM Lampung", status="active", metric="RMSLE", participants=128,
                        prize_pool="Rp15.000.000", starts_at=dt("2026-06-01T00:00:00Z"),
                        ends_at=dt("2026-07-15T23:59:00Z"),
                        daily_submission_limit=5,
                        overview_md="Bangun model peramalan permintaan mingguan untuk 200 UMKM binaan.",
                        rules_md="Satu peserta maksimal 5 submission per hari.",
                        dataset_info_md="Data penjualan historis 18 bulan, anonim per UMKM.",
                        prizes=[{"rank": 1, "reward": "Rp8.000.000 + peluang rekrutmen"},
                                {"rank": 2, "reward": "Rp4.000.000"}, {"rank": 3, "reward": "Rp3.000.000"}],
                        tags=["forecasting", "umkm", "tabular"]),
            Competition(id="cmp_02", slug="deteksi-penyakit-padi", title="Deteksi Penyakit Padi dari Citra Drone",
                        sponsor="ITERA × Dinas Pertanian Sumsel", status="active", metric="F1 Score", participants=76,
                        prize_pool="Rp10.000.000", starts_at=dt("2026-05-15T00:00:00Z"),
                        ends_at=dt("2026-07-01T23:59:00Z"),
                        overview_md="Kompetisi Deteksi Penyakit Padi dari Citra Drone.",
                        rules_md="Ikuti pedoman kompetisi dan hormati kode etik komunitas PSD.",
                        dataset_info_md="Dataset tersedia setelah registrasi kompetisi.",
                        prizes=[{"rank": 1, "reward": "Rp5.000.000"}], tags=["computer-vision", "pertanian"]),
            Competition(id="cmp_03", slug="sentimen-ulasan-ecommerce", title="Klasifikasi Sentimen Ulasan E-Commerce",
                        sponsor="PSD Community", status="upcoming", metric="Accuracy", participants=0,
                        prize_pool="Rp5.000.000", starts_at=dt("2026-07-20T00:00:00Z"),
                        ends_at=dt("2026-08-20T23:59:00Z"),
                        overview_md="Kompetisi Klasifikasi Sentimen Ulasan E-Commerce.",
                        rules_md="Ikuti pedoman kompetisi.", dataset_info_md="Dataset tersedia setelah registrasi.",
                        prizes=[{"rank": 1, "reward": "Rp5.000.000"}], tags=["nlp", "sentimen"]),
            Competition(id="cmp_04", slug="optimasi-rute-logistik", title="Optimasi Rute Logistik UMKM",
                        sponsor="Koperasi Digital Nusantara", status="upcoming", metric="Total Distance",
                        participants=0, prize_pool="Rp8.000.000",
                        starts_at=dt("2026-08-01T00:00:00Z"), ends_at=dt("2026-09-15T23:59:00Z"),
                        overview_md="Kompetisi Optimasi Rute Logistik UMKM.",
                        rules_md="Ikuti pedoman kompetisi.", dataset_info_md="Dataset tersedia setelah registrasi.",
                        prizes=[{"rank": 1, "reward": "Rp5.000.000"}], tags=["optimasi", "umkm"]),
            Competition(id="cmp_05", slug="forecast-cuaca-pertanian-2025", title="Forecast Cuaca untuk Pertanian 2025",
                        sponsor="BMKG Kolaborasi", status="past", metric="MAE", participants=203,
                        prize_pool="Rp12.000.000", starts_at=dt("2025-10-01T00:00:00Z"),
                        ends_at=dt("2025-12-31T23:59:00Z"),
                        overview_md="Kompetisi Forecast Cuaca untuk Pertanian 2025.",
                        rules_md="Ikuti pedoman kompetisi.", dataset_info_md="Dataset tersedia setelah registrasi.",
                        prizes=[{"rank": 1, "reward": "Rp5.000.000"}], tags=["forecasting", "pertanian"]),
        ]
        db.add_all(competitions)

        submission_scores = [
            ("sub_01", "usr_01", 0.452, 0.441),
            ("sub_02", "usr_02", 0.468, 0.455),
            ("sub_03", "usr_satria", 0.481, 0.470),
            ("sub_04", "usr_itera", 0.493, 0.488),
            ("sub_05", "usr_lampung", 0.505, 0.501),
        ]
        for i, (sid, user_id, pub, prv) in enumerate(submission_scores):
            db.add(Submission(
                id=sid,
                competition_id="cmp_01",
                user_id=user_id,
                filename=f"submission_{i + 1}.csv",
                status="scored",
                public_score=pub,
                private_score=prv,
                file_key=f"submissions/cmp_01/{user_id}/{sid}.csv",
                created_at=dt(f"2026-06-{20 - i:02d}T10:00:00Z"),
            ))

        for i, username in enumerate(LEADERBOARD_NAMES):
            db.add(LeaderboardRow(
                competition_id="cmp_01", board="public", rank=i + 1,
                participant_username=username,
                score=round(0.45 + i * 0.012, 3),
                submitted_at=dt(f"2026-06-{20 - min(i, 19):02d}T{8 + (i % 12):02d}:00:00Z"),
            ))

        events_data = [
            ("evt_01", "demo-day-sains-data-itera", "Demo Day Sains Data ITERA", "demo_day", "luring", "upcoming",
             "2026-07-10T08:00:00Z", "2026-07-10T17:00:00Z", "Gedung Auditorium ITERA, Lampung Selatan", 200, 145,
             "Acara showcase proyek sains data mahasiswa dan komunitas ITERA.",
             [{"time": "08:00", "title": "Registrasi & networking"}, {"time": "09:00", "title": "Pembukaan & keynote"}],
             [{"name": "Dr. Ahmad Fauzi", "title": "Kepala Lab Sains Data ITERA", "avatar_url": None}]),
            ("evt_02", "webinar-nlp-bahasa-indonesia", "Webinar: NLP untuk Bahasa Indonesia", "webinar", "daring",
             "upcoming", "2026-07-05T13:00:00Z", "2026-07-05T15:00:00Z", None, 500, 312,
             "Webinar: NLP untuk Bahasa Indonesia — event webinar mode daring.",
             [{"time": "09:00", "title": "Pembukaan"}], [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_03", "hackathon-umkm-digital", "Hackathon UMKM Digital Lampung", "hackathon", "luring", "upcoming",
             "2026-08-15T08:00:00Z", "2026-08-17T18:00:00Z", "Co-working Space Bandar Lampung", 60, 48,
             "Hackathon UMKM Digital Lampung.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_04", "bootcamp-analisis-big-data", "Bootcamp Analisis Big Data", "bootcamp", "daring", "upcoming",
             "2026-07-20T01:00:00Z", "2026-08-20T10:00:00Z", None, 100, 89,
             "Bootcamp Analisis Big Data.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_05", "meetup-komunitas-psd-lampung", "Meetup Komunitas PSD Lampung", "meetup", "luring", "upcoming",
             "2026-06-28T14:00:00Z", "2026-06-28T17:00:00Z", "Kafe Kopi Nusantara, Bandar Lampung", 40, 35,
             "Meetup Komunitas PSD Lampung.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_06", "webinar-computer-vision-pertanian", "Webinar: Computer Vision untuk Pertanian", "webinar",
             "daring", "upcoming", "2026-07-12T10:00:00Z", "2026-07-12T12:00:00Z", None, None, 178,
             "Webinar Computer Vision untuk Pertanian.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_07", "demo-day-umkm-nasional", "Demo Day UMKM Nasional", "demo_day", "daring", "upcoming",
             "2026-09-01T08:00:00Z", "2026-09-01T16:00:00Z", None, 1000, 0,
             "Demo Day UMKM Nasional.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
            ("evt_08", "bootcamp-forecasting-umkm", "Bootcamp Forecasting untuk UMKM", "bootcamp", "daring",
             "upcoming", "2026-08-01T01:00:00Z", "2026-08-31T10:00:00Z", None, 50, 22,
             "Bootcamp Forecasting untuk UMKM.", [{"time": "09:00", "title": "Pembukaan"}],
             [{"name": "Tim PSD", "title": "Penyelenggara", "avatar_url": None}]),
        ]
        for eid, slug, title, etype, mode, status, start, end, loc, cap, reg_count, desc, agenda, speakers in events_data:
            db.add(Event(
                id=eid, slug=slug, title=title, type=etype, mode=mode, status=status,
                starts_at=dt(start), ends_at=dt(end), location=loc, capacity=cap,
                description_md=desc, agenda=agenda, speakers=speakers,
            ))
            for _ in range(reg_count):
                db.add(EventRegistration(event_id=eid, user_id=uid["budi-santoso"], status="registered"))

        courses_data = [
            ("pengantar-analisis-big-data", "Pengantar Analisis Big Data", "pemula",
             "Pelajari dasar-dasar analisis big data.",
             [{"title": "Dasar Big Data", "lessons": [
                 {"id": "l1", "title": "Apa itu Big Data?", "duration_min": 15,
                  "content_md": "## Big Data\n\nBig Data adalah kumpulan data yang **volume**, **kecepatan**, dan **variasi**-nya melebihi kapasitas pemrosesan tradisional.",
                  "video_url": None},
                 {"id": "l2", "title": "Ekosistem Hadoop & Spark", "duration_min": 25,
                  "content_md": "## Hadoop & Spark\n\nHadoop menyimpan data terdistribusi; Spark memproses data dalam memori.",
                  "video_url": None},
             ]}]),
            ("python-untuk-sains-data", "Python untuk Sains Data", "pemula",
             "Kursus Python untuk Sains Data untuk level pemula.",
             [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan Python untuk sains data.", "video_url": None}]}]),
            ("machine-learning-praktis", "Machine Learning Praktis", "menengah",
             "Kursus Machine Learning Praktis untuk level menengah.",
             [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan machine learning.", "video_url": None}]}]),
            ("nlp-bahasa-indonesia", "NLP Bahasa Indonesia", "menengah",
             "Kursus NLP Bahasa Indonesia.", [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan NLP Indonesia.", "video_url": None}]}]),
            ("computer-vision-pertanian", "Computer Vision untuk Pertanian", "mahir",
             "Kursus Computer Vision untuk Pertanian.", [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan CV untuk pertanian.", "video_url": None}]}]),
            ("visualisasi-data-interaktif", "Visualisasi Data Interaktif", "pemula",
             "Kursus Visualisasi Data Interaktif.", [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan visualisasi data.", "video_url": None}]}]),
            ("forecasting-umkm", "Forecasting untuk UMKM", "menengah",
             "Kursus Forecasting untuk UMKM.", [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan forecasting UMKM.", "video_url": None}]}]),
            ("etika-dan-governance-data", "Etika dan Governance Data", "pemula",
             "Kursus Etika dan Governance Data.", [{"title": "Modul 1", "lessons": [{"id": "l1", "title": "Pengenalan", "duration_min": 15,
                  "content_md": "Pengenalan etika data.", "video_url": None}]}]),
        ]
        for slug, title, level, desc, modules in courses_data:
            db.add(Course(
                slug=slug, title=title, level=level, description=desc, modules=modules,
                author_id=uid["budi-santoso"], status="published",
                published_at=dt("2026-01-01T00:00:00Z"),
            ))

        db.add(Enrollment(user_id=uid["budi-santoso"], course_slug="pengantar-analisis-big-data"))
        db.add(LessonProgress(user_id=uid["budi-santoso"], course_slug="pengantar-analisis-big-data", lesson_id="l1"))

        paths = [
            ("jalur-data-scientist", "Jalur Data Scientist",
             "Dari Python dasar hingga machine learning praktis untuk menjadi data scientist.",
             ["python-untuk-sains-data", "pengantar-analisis-big-data", "machine-learning-praktis", "visualisasi-data-interaktif"]),
            ("jalur-nlp-indonesia", "Jalur NLP Indonesia", "Spesialisasi NLP untuk teks berbahasa Indonesia.",
             ["python-untuk-sains-data", "nlp-bahasa-indonesia", "machine-learning-praktis"]),
            ("jalur-umkm-analytics", "Jalur UMKM Analytics", "Analisis dan forecasting khusus untuk bisnis UMKM.",
             ["pengantar-analisis-big-data", "forecasting-umkm", "visualisasi-data-interaktif"]),
        ]
        for slug, title, desc, course_slugs in paths:
            db.add(LearningPath(slug=slug, title=title, description=desc, course_slugs=course_slugs))

        notebooks_data = [
            (
                "nb_01",
                "Eksplorasi Dataset Ulasan Marketplace",
                "usr_01",
                ["nlp", "eda"],
                "Notebook eksplorasi dataset ulasan marketplace Indonesia.",
                None,
            ),
            (
                "nb_02",
                "Tutorial Klasifikasi Gambar (TensorFlow)",
                "usr_psd",
                ["tutorial", "cv"],
                "Notebook resmi PSD — klasifikasi gambar dengan TensorFlow/Keras.",
                "https://github.com/tensorflow/docs/blob/master/site/en/tutorials/keras/classification.ipynb",
            ),
            (
                "nb_03",
                "Pengenalan Pandas untuk Sains Data",
                "usr_psd",
                ["pandas", "pemula"],
                "Notebook resmi PSD — pengenalan Pandas untuk analisis data.",
                "https://github.com/pandas-dev/pandas/blob/main/doc/cheatsheet/Pandas_Cheat_Sheet.ipynb",
            ),
            (
                "nb_04",
                "CNN untuk Deteksi Penyakit Padi",
                "usr_02",
                ["cv", "pertanian"],
                "Eksperimen CNN untuk deteksi penyakit padi.",
                None,
            ),
            (
                "nb_05",
                "Forecasting dengan LSTM",
                "usr_01",
                ["forecasting", "lstm"],
                "Notebook forecasting deret waktu dengan LSTM.",
                "https://gist.githubusercontent.com/example/forecast-lstm.ipynb",
            ),
            (
                "nb_06",
                "Analisis Survei Digital UMKM",
                "usr_psd",
                ["survei", "umkm"],
                "Analisis survei digital UMKM — notebook referensi PSD.",
                "https://github.com/scikit-learn/scikit-learn/blob/main/notebooks/cluster/plot_kmeans_assumptions.ipynb",
            ),
        ]
        for nid, title, owner_id, tags, desc, source_url in notebooks_data:
            db.add(
                Notebook(
                    id=nid,
                    title=title,
                    owner_id=owner_id,
                    tags=tags,
                    description=desc,
                    source_url=source_url,
                )
            )

        threads_data = [
            ("thr_01", "Tips preprocessing teks bahasa Indonesia", "budi-santoso",
             ["nlp", "preprocessing"], "2026-06-18T08:00:00Z", "2026-06-22T14:00:00Z",
             "Halo semua! Saya ingin berbagi workflow preprocessing teks Indonesia..."),
            ("thr_02", "Dataset UMKM mana yang cocok untuk pemula?", "siti-rahayu",
             ["umkm", "dataset"], "2026-06-15T10:00:00Z", "2026-06-21T09:00:00Z",
             "Isi diskusi: Dataset UMKM mana yang cocok untuk pemula?"),
            ("thr_03", "Pengalaman ikut kompetisi prediksi permintaan UMKM", "budi-santoso",
             ["kompetisi", "forecasting"], "2026-06-10T12:00:00Z", "2026-06-20T16:00:00Z",
             "Isi diskusi: Pengalaman ikut kompetisi prediksi permintaan UMKM"),
            ("thr_04", "Cara deploy model ke production dengan budget terbatas", "psd",
             ["deployment", "mlops"], "2026-06-08T14:00:00Z", "2026-06-19T11:00:00Z",
             "Isi diskusi: Cara deploy model ke production dengan budget terbatas"),
            ("thr_05", "Rekomendasi course untuk mahasiswa semester awal", "siti-rahayu",
             ["belajar", "pemula"], "2026-06-05T09:00:00Z", "2026-06-18T13:00:00Z",
             "Isi diskusi: Rekomendasi course untuk mahasiswa semester awal"),
            ("thr_06", "Computer vision untuk pertanian: tantangan di lapangan", "itera-ds",
             ["cv", "pertanian"], "2026-06-03T11:00:00Z", "2026-06-17T10:00:00Z",
             "Isi diskusi: Computer vision untuk pertanian"),
            ("thr_07", "Etika penggunaan data UMKM", "psd",
             ["etika", "umkm"], "2026-06-01T08:00:00Z", "2026-06-16T15:00:00Z",
             "Isi diskusi: Etika penggunaan data UMKM"),
            ("thr_08", "Sharing notebook forecasting mingguan", "budi-santoso",
             ["notebook", "forecasting"], "2026-05-28T14:00:00Z", "2026-06-14T12:00:00Z",
             "Isi diskusi: Sharing notebook forecasting mingguan"),
        ]
        for tid, title, author, tags, created, activity, body in threads_data:
            db.add(Thread(
                id=tid, title=title, author_id=uid[author], tags=tags,
                body_md=body, created_at=dt(created), last_activity_at=dt(activity),
            ))
        await db.flush()

        db.add_all([
            ForumPost(id="post_01", thread_id="thr_01", author_id=uid["siti-rahayu"],
                 body_md="Terima kasih sharingnya! Apakah ada library khusus untuk normalisasi slang Indonesia?",
                 created_at=dt("2026-06-19T10:00:00Z")),
            ForumPost(id="post_02", thread_id="thr_01", author_id=uid["budi-santoso"],
                 body_md="Saya pakai kombinasi regex custom + kamus slang. Bisa cek notebook saya di /notebooks/nb_01.",
                 created_at=dt("2026-06-20T14:00:00Z")),
        ])

        await db.commit()
        print("Seed selesai.")


if __name__ == "__main__":
    asyncio.run(run())
