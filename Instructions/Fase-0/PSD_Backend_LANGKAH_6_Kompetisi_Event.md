# Langkah 6 — Modul Kompetisi & Event

> **Tujuan:** Endpoint kompetisi (daftar, detail, leaderboard, submission) dan event (daftar, detail, daftar-ikut) — mesin pertemuan supply–demand. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 5.
>
> **Catatan Fase 0:** evaluasi/scoring submission **belum** dijalankan (eksekusi kode tak tepercaya = pekerjaan pengerasan, Langkah 9). Submission cukup disimpan dengan status `queued`.

## 6.1 Model — `app/modules/competitions/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


def _id(p): return lambda: f"{p}_{uuid.uuid4().hex[:12]}"


class Competition(Base):
    __tablename__ = "competitions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("cmp"))
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    sponsor: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, index=True)   # active | upcoming | past
    metric: Mapped[str] = mapped_column(String)
    participants: Mapped[int] = mapped_column(Integer, default=0)
    prize_pool: Mapped[str | None] = mapped_column(String, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    overview_md: Mapped[str] = mapped_column(String, default="")
    rules_md: Mapped[str] = mapped_column(String, default="")
    dataset_info_md: Mapped[str] = mapped_column(String, default="")
    prizes: Mapped[list] = mapped_column(JSON, default=list)   # [{rank, reward}]
    tags: Mapped[list] = mapped_column(JSON, default=list)


class LeaderboardRow(Base):
    __tablename__ = "leaderboard_rows"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("lb"))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    board: Mapped[str] = mapped_column(String, default="public")   # public | private
    rank: Mapped[int] = mapped_column(Integer)
    participant_username: Mapped[str] = mapped_column(String)
    participant_avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[float] = mapped_column(Float)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Submission(Base):
    __tablename__ = "submissions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("sub"))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")   # queued | scored | failed
    public_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

## 6.2 Model Event — `app/modules/events/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Event(Base):
    __tablename__ = "events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)   # webinar|hackathon|bootcamp|meetup|demo_day
    mode: Mapped[str] = mapped_column(String)   # daring | luring
    status: Mapped[str] = mapped_column(String, index=True, default="upcoming")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description_md: Mapped[str] = mapped_column(String, default="")
    agenda: Mapped[list] = mapped_column(JSON, default=list)    # [{time, title}]
    speakers: Mapped[list] = mapped_column(JSON, default=list)  # [{name, title, avatar_url}]


class EventRegistration(Base):
    __tablename__ = "event_registrations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"reg_{uuid.uuid4().hex[:12]}")
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="registered")  # registered | waitlisted
```

## 6.3 Router Kompetisi — `app/modules/competitions/router.py`

```python
from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.competitions.models import Competition, LeaderboardRow, Submission

router = APIRouter(tags=["competitions"])

SUMMARY = ("slug", "title", "sponsor", "status", "metric", "participants",
           "prize_pool", "starts_at", "ends_at", "cover_url")


def _summary(c): return {k: getattr(c, k) for k in SUMMARY}
def _detail(c): return {**_summary(c), "overview_md": c.overview_md, "rules_md": c.rules_md,
                        "dataset_info_md": c.dataset_info_md, "prizes": c.prizes, "tags": c.tags}


@router.get("/competitions")
async def list_competitions(status: str | None = None, p: PageParams = Depends(page_params),
                            db: AsyncSession = Depends(get_db)):
    stmt = select(Competition)
    if status:
        stmt = stmt.where(Competition.status == status)
    stmt = stmt.order_by(Competition.starts_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(c) for c in rows], total, p)


async def _get(db, slug) -> Competition:
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    return c


@router.get("/competitions/{slug}")
async def get_competition(slug: str, db: AsyncSession = Depends(get_db)):
    return _detail(await _get(db, slug))


@router.get("/competitions/{slug}/leaderboard")
async def leaderboard(slug: str, board: str = "public", p: PageParams = Depends(page_params),
                      db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    stmt = (select(LeaderboardRow)
            .where(LeaderboardRow.competition_id == c.id, LeaderboardRow.board == board)
            .order_by(LeaderboardRow.rank.asc()))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{"rank": r.rank, "score": r.score, "submitted_at": r.submitted_at,
              "participant": {"username": r.participant_username, "type": "user",
                              "avatar_url": r.participant_avatar_url}} for r in rows]
    return paginated(items, total, p)


@router.get("/competitions/{slug}/submissions")
async def my_submissions(slug: str, user: User = Depends(get_current_user),
                         p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    stmt = (select(Submission).where(Submission.competition_id == c.id, Submission.user_id == user.id)
            .order_by(Submission.created_at.desc()))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{"id": s.id, "created_at": s.created_at, "status": s.status,
              "public_score": s.public_score, "filename": s.filename} for s in rows]
    return paginated(items, total, p)


@router.post("/competitions/{slug}/submissions", status_code=201)
async def submit(slug: str, file: UploadFile = File(...), user: User = Depends(get_current_user),
                 db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    # Fase 0: simpan metadata saja, status "queued". Scoring nyata = Langkah 9.
    s = Submission(competition_id=c.id, user_id=user.id, filename=file.filename or "submission.csv")
    db.add(s); await db.commit(); await db.refresh(s)
    return {"id": s.id, "created_at": s.created_at, "status": s.status,
            "public_score": s.public_score, "filename": s.filename}
```

> Upload file butuh `python-multipart` — tambahkan ke `requirements.txt` lalu rebuild.

## 6.4 Router Event — `app/modules/events/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.events.models import Event, EventRegistration

router = APIRouter(tags=["events"])
SUMMARY = ("slug", "title", "type", "mode", "starts_at", "ends_at", "location", "cover_url", "capacity")


async def _registered_count(db, event_id) -> int:
    return (await db.execute(select(func.count()).select_from(EventRegistration)
            .where(EventRegistration.event_id == event_id))).scalar_one()


@router.get("/events")
async def list_events(status: str | None = None, type: str | None = None,
                      p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    stmt = select(Event)
    if status:
        stmt = stmt.where(Event.status == status)
    if type:
        stmt = stmt.where(Event.type == type)
    stmt = stmt.order_by(Event.starts_at.asc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{**{k: getattr(e, k) for k in SUMMARY}, "registered": await _registered_count(db, e.id)}
             for e in rows]
    return paginated(items, total, p)


async def _get(db, slug) -> Event:
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if not e:
        raise ApiError(404, "not_found", "Event tidak ditemukan")
    return e


@router.get("/events/{slug}")
async def get_event(slug: str, db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    return {**{k: getattr(e, k) for k in SUMMARY}, "registered": await _registered_count(db, e.id),
            "description_md": e.description_md, "agenda": e.agenda, "speakers": e.speakers}


@router.post("/events/{slug}/register", status_code=201)
async def register_event(slug: str, user: User = Depends(get_current_user),
                         db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    count = await _registered_count(db, e.id)
    status = "waitlisted" if e.capacity is not None and count >= e.capacity else "registered"
    reg = EventRegistration(event_id=e.id, user_id=user.id, status=status)
    db.add(reg); await db.commit(); await db.refresh(reg)
    return {"registration_id": reg.id, "status": reg.status}
```

## 6.5 Migrasi & wire

```bash
docker compose exec backend alembic revision --autogenerate -m "create competitions and events"
docker compose exec backend alembic upgrade head
```

Impor model di `alembic/env.py` (`app.modules.competitions.models`, `app.modules.events.models`) dan di `main.py`:

```python
from app.modules.competitions.router import router as comp_router
from app.modules.events.router import router as events_router
app.include_router(comp_router, prefix=settings.API_PREFIX)
app.include_router(events_router, prefix=settings.API_PREFIX)
```

## Selesai bila

- [ ] `GET /competitions?status=active` & `GET /competitions/{slug}` sesuai kontrak.
- [ ] `GET /competitions/{slug}/leaderboard?board=public` mengembalikan baris terurut.
- [ ] `POST /competitions/{slug}/submissions` (ber-auth, file) → submission `queued`.
- [ ] `GET /events`, `GET /events/{slug}`, dan `POST /events/{slug}/register` bekerja (registered/waitlisted sesuai kapasitas).
