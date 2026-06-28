# Langkah 16 — Pencarian & Penemuan (Meilisearch)

> **Tujuan:** Pencarian nyata (Meilisearch), filter tag & sortir, pencarian global, serta bagian "unggulan/terbaru". **Kerjakan hanya langkah ini.** Prasyarat: Langkah 5–7.

## 16.1 Service & config

Tambah service Meilisearch ke `docker-compose.yml` (lihat Langkah 9.1) dan config:

```python
MEILI_URL: str = "http://meilisearch:7700"
MEILI_KEY: str = "psd-search-key"
```

Dependensi: `meilisearch` (Python). `docker compose up -d --build`.

## 16.2 Klien & indeks — `app/core/search.py`

```python
import meilisearch
from app.core.config import settings

client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_KEY)

def ensure_indexes():
    repos = client.index("repos")
    repos.update_searchable_attributes(["name", "description", "tags"])
    repos.update_filterable_attributes(["kind", "tags", "visibility"])
    repos.update_sortable_attributes(["downloads", "likes", "updated_at"])
    comps = client.index("competitions")
    comps.update_searchable_attributes(["title", "tags", "sponsor"])
    comps.update_filterable_attributes(["status", "tags"])

def index_repo(r):
    client.index("repos").add_documents([{
        "id": r.id, "slug": r.slug, "kind": r.kind, "name": r.name,
        "description": r.description, "tags": r.tags, "visibility": r.visibility,
        "owner": r.owner.username, "likes": r.likes, "downloads": r.downloads,
    }])

def delete_repo_doc(repo_id: str):
    client.index("repos").delete_document(repo_id)

def index_competition(c):
    client.index("competitions").add_documents([{
        "id": c.id, "slug": c.slug, "title": c.title, "sponsor": c.sponsor,
        "status": c.status, "tags": c.tags,
    }])
```

Panggil `ensure_indexes()` saat startup (`app/main.py`, event startup) dan `index_*` di endpoint create/update; `delete_*` saat hapus.

## 16.3 Skrip reindex — `app/reindex.py`

```python
import asyncio
from sqlalchemy import select
from app.core.db import SessionLocal
from app.core.search import ensure_indexes, index_repo, index_competition
from app.modules.repos.models import Repo
from app.modules.competitions.models import Competition

async def run():
    ensure_indexes()
    async with SessionLocal() as db:
        for r in (await db.execute(select(Repo))).scalars().all():
            index_repo(r)
        for c in (await db.execute(select(Competition))).scalars().all():
            index_competition(c)
    print("Reindex selesai.")

if __name__ == "__main__":
    asyncio.run(run())
```

Jalankan setelah seed: `docker compose exec backend python -m app.reindex`.

## 16.4 Pencarian global — `app/modules/search/router.py`

```python
from fastapi import APIRouter, Query
from app.core.search import client

router = APIRouter(tags=["search"])

@router.get("/search")
async def search(q: str = Query(...), type: str | None = None):
    out = {}
    targets = [type] if type in ("repos", "competitions") else ["repos", "competitions"]
    for idx in targets:
        res = client.index(idx).search(q, {"limit": 10})
        out[idx] = res["hits"]
    return out
```

Wire di `main.py`: `app.include_router(search_router, prefix=settings.API_PREFIX)`.

## 16.5 Matangkan filter & sortir di daftar aset (Langkah 5)

Lengkapi `_list` agar memakai `tags` & `sort` (gunakan Meili saat `q`/`tags` ada; Postgres untuk daftar biasa):

```python
async def _list(db, kind, q, tags, sort, p):
    if q or tags:
        filters = [f'kind = "{kind}"']
        if tags:
            filters += [f'tags = "{t}"' for t in tags.split(",")]
        res = client.index("repos").search(q or "", {
            "filter": " AND ".join(filters),
            "sort": [sort.lstrip("-") + (":desc" if sort.startswith("-") else ":asc")] if sort else [],
            "offset": p.offset, "limit": p.page_size,
        })
        # ambil ulang detail dari DB berdasarkan id hits (atau pakai hit langsung utk summary)
        ids = [h["id"] for h in res["hits"]]
        rows = (await db.execute(select(Repo).where(Repo.id.in_(ids)))).scalars().all() if ids else []
        return paginated([to_summary(r) for r in rows], res["estimatedTotalHits"], p)
    # jalur Postgres biasa (kode lama)
    ...
```

## 16.6 Penemuan — `GET /discover` (susun dari endpoint yang ada)

```python
@router.get("/discover")
async def discover(db: AsyncSession = Depends(get_db)):
    async def top(order):
        rows = (await db.execute(select(Repo).where(Repo.visibility == "public")
                .order_by(order).limit(6))).scalars().all()
        return [to_summary(r) for r in rows]
    return {
        "featured": await top(Repo.likes.desc()),
        "recent": await top(Repo.updated_at.desc()),
    }
```

(letakkan di router repos/discover; kompetisi/event aktif sudah tersedia via endpoint masing-masing.)

## 16.7 Pembaruan Kontrak (Bagian 8 dokumen frontend)

| Metode | Path | Auth | Query | Respons |
|---|---|---|---|---|
| GET | `/search` | — | `q` (wajib), `type?` | `{ repos: [], competitions: [] }` (hits) |
| GET | `/discover` | — | — | `{ featured: RepoSummary[], recent: RepoSummary[] }` |

`GET /{kind}` kini benar-benar memfilter `tags` & menghormati `sort` (mis. `-downloads`, `-likes`, `-updated_at`).

## Selesai bila

- [ ] Meilisearch jalan; `python -m app.reindex` mengisi indeks.
- [ ] `GET /search?q=` mengembalikan hasil relevan lintas aset & kompetisi.
- [ ] `GET /{kind}?tags=nlp&sort=-downloads` memfilter & mengurutkan benar.
- [ ] `GET /discover` mengembalikan unggulan & terbaru.
- [ ] Create/update/delete aset menyinkronkan indeks (hasil pencarian ikut berubah).
