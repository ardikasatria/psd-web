# Langkah 42 — Ruang Ide: Tantang & Publikasi

> **Tujuan:** Langkah terakhir Ruang Ide — dari ruang `finished`, buat **kompetisi penantang** (status `challenged`) dan publikasikan aset (data/model/notebook) dengan jejak provenance `room_id`. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 39–41, Kompetisi (19), Repo/Notebook (15/22).

## 42.1 Field provenance — pastikan ada

`Repo.room_id` sudah ditambahkan (Langkah 40). Tambahkan serupa ke `Notebook` (Langkah 22) bila ingin notebook ikut tertaut:

```python
room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
```

Tambah `Competition.room_id` (Langkah 19) untuk menautkan kompetisi penantang ke ruang asalnya:

```python
room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "room provenance and challenge"
docker compose exec backend alembic upgrade head
```

## 42.2 Tantang → kompetisi — `app/modules/rooms/router.py`

```python
from datetime import datetime, timezone, timedelta
from app.modules.competitions.models import Competition
from app.modules.categories.util import slugify

@router.post("/idea-rooms/{slug}/challenge", status_code=201)
async def challenge(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "finished":
        raise ApiError(400, "invalid_state", "Tantangan hanya dari ruang finished")
    prob = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))).scalar_one_or_none()
    metric = body.get("metric") or (prob.suggested_metric if prob else "RMSE")
    days = int(body.get("duration_days", 14))
    now = datetime.now(timezone.utc)
    cslug = slugify(body.get("title") or f"tantangan-{r.slug}")
    if (await db.execute(select(Competition).where(Competition.slug == cslug))).scalar_one_or_none():
        cslug = f"{cslug}-{__import__('uuid').uuid4().hex[:4]}"
    c = Competition(
        slug=cslug, title=body.get("title") or f"Tantangan: {r.title}",
        sponsor=body.get("sponsor"), status="active", metric=metric,
        starts_at=now, ends_at=now + timedelta(days=days),
        overview_md=(prob.statement_md if prob else r.pitch_md),
        rules_md=body.get("rules_md", "Diturunkan dari Ruang Ide."),
        dataset_info_md=f"Dataset ruang: {r.dataset_repo_slug or '-'}",
        category_id=r.category_id, subcategory_id=r.subcategory_id,
        tags=body.get("tags", []), room_id=r.id,
    )
    db.add(c)
    r.status = "challenged"
    await db.commit()
    return {"competition_slug": c.slug, "status": r.status}
```

> Kompetisi memakai dataset & metrik ruang. Scoring file (Langkah 19) berlaku bila penyelenggara mengunggah kunci jawaban; jika tidak, kompetisi berjalan sebagai tantangan terbuka (submission tersimpan).

## 42.3 Publikasi aset (provenance) — `app/modules/rooms/router.py`

```python
from app.modules.repos.models import Repo
from app.modules.learn.models import Notebook   # bila Notebook punya room_id

@router.post("/idea-rooms/{slug}/publish-assets")
async def publish_assets(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status not in ("finished", "challenged"):
        raise ApiError(400, "invalid_state", "Publikasi hanya dari ruang finished/challenged")
    vis = body.get("visibility", "public")
    published = []
    for ref in body.get("assets", []):          # [{type, slug/id}]
        t = ref.get("type")
        if t in ("dataset", "model", "project"):
            repo = (await db.execute(select(Repo).where(Repo.slug == ref["slug"]))).scalar_one_or_none()
            if repo and repo.team_id == r.team_id:
                repo.visibility = vis
                if repo.room_id is None: repo.room_id = r.id
                published.append(ref)
        elif t == "notebook":
            nb = (await db.execute(select(Notebook).where(Notebook.id == ref["id"]))).scalar_one_or_none()
            if nb:
                if hasattr(nb, "visibility"): nb.visibility = vis
                if hasattr(nb, "room_id") and nb.room_id is None: nb.room_id = r.id
                published.append(ref)
    await db.commit()
    return {"published": published}

@router.get("/idea-rooms/{slug}/assets")
async def room_assets(slug: str, db=Depends(get_db)):
    r = await get_room(db, slug)
    repos = (await db.execute(select(Repo).where(Repo.room_id == r.id))).scalars().all()
    return {"items": [{"type": x.kind, "slug": x.slug, "name": x.name,
                       "visibility": x.visibility, "synthetic": getattr(x, "synthetic", False)} for x in repos]}
```

## 42.4 Tautan provenance di detail aset

Pada detail Repo (Langkah 5/15), bila `room_id` terisi sertakan ringkas:

```python
# dalam to_detail(): tambahkan
"from_room": r.room_id  # frontend menautkan ke /idea-rooms/{slug} via lookup ringkas
```

> Opsional: endpoint kecil `GET /idea-rooms/by-id/{room_id}` mengembalikan `{slug, title}` agar aset bisa menautkan balik ke ruang asal.

## 42.5 Pembaruan Kontrak (Bagian 8)

- `Competition` **+** `room_id?`; `Repo`/`Notebook` **+** `room_id?`; `RepoDetail` **+** `from_room?`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/idea-rooms/{slug}/challenge` | master | finished → buat kompetisi, ruang→challenged |
| POST | `/idea-rooms/{slug}/publish-assets` | master | `{assets:[{type,slug/id}], visibility}` |
| GET | `/idea-rooms/{slug}/assets` | — | aset bertaut ruang |

## Selesai bila

- [ ] Dari ruang `finished`, master membuat kompetisi (memakai dataset/metrik/kategori ruang); ruang → `challenged`.
- [ ] Publikasi aset mengubah visibilitas & menautkan `room_id` (provenance), hanya untuk aset tim ruang.
- [ ] Aset menampilkan tautan balik ke ruang asal.
- [ ] `GET /idea-rooms/{slug}/assets` mendaftar aset ruang.

> **Ruang Ide kini lengkap (Langkah 39–42).** Siklus penuh: ajukan → join → framing → ramu masalah → generasi/kumpul data → solusi tim → submit → finish → tantang/publikasi. Jalankan migrasi 39→42 berurutan, lalu uji E2E.
