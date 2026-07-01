import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import require_staff
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.models import Category
from app.modules.categories.service import load_category_refs
from app.modules.categories.util import slugify
from app.modules.collections.models import Collection
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_summary

router = APIRouter(tags=["collections"])


async def _resolve_items(db: AsyncSession, items: list | None) -> list[dict]:
    out: list[dict] = []
    for it in items or []:
        t = it.get("type")
        if t in ("model", "dataset", "project"):
            r = (
                await db.execute(
                    select(Repo).options(selectinload(Repo.owner)).where(Repo.slug == it.get("slug"))
                )
            ).scalar_one_or_none()
            if r and getattr(r, "visibility", "public") == "public":
                out.append(
                    {
                        "type": t,
                        "slug": r.slug,
                        "name": r.name,
                        "owner": r.owner.username,
                        "likes": r.likes,
                        "downloads": r.downloads,
                    }
                )
        elif t == "notebook":
            nb = (await db.execute(select(Notebook).where(Notebook.id == it.get("id")))).scalar_one_or_none()
            if nb:
                out.append({"type": "notebook", "id": nb.id, "title": nb.title})
    return out


def _summary(c: Collection) -> dict:
    return {
        "slug": c.slug,
        "title": c.title,
        "cover_url": c.cover_url,
        "is_featured": c.is_featured,
        "count": len(c.items or []),
    }


@router.get("/collections")
async def list_collections(
    category: str | None = None,
    featured: bool | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Collection)
    if featured is not None:
        stmt = stmt.where(Collection.is_featured == featured)
    if category:
        cat = (await db.execute(select(Category).where(Category.slug == category))).scalar_one_or_none()
        if cat:
            stmt = stmt.where(Collection.category_id == cat.id)
    stmt = stmt.order_by(Collection.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(c) for c in rows], total, p)


@router.get("/collections/{slug}")
async def get_collection(slug: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Koleksi tidak ditemukan")
    return {
        **_summary(c),
        "description_md": c.description_md,
        "items": await _resolve_items(db, c.items),
    }


@router.post("/collections", status_code=201)
async def create_collection(body: dict, staff=Depends(require_staff), db: AsyncSession = Depends(get_db)):
    base = slugify(body["title"])
    cslug = base
    if (await db.execute(select(Collection).where(Collection.slug == cslug))).scalar_one_or_none():
        cslug = f"{base}-{uuid.uuid4().hex[:4]}"
    cat_id = None
    if body.get("category"):
        cat = (await db.execute(select(Category).where(Category.slug == body["category"]))).scalar_one_or_none()
        cat_id = cat.id if cat else None
    c = Collection(
        slug=cslug,
        title=body["title"],
        description_md=body.get("description_md", ""),
        cover_url=body.get("cover_url"),
        owner_id=staff.id,
        category_id=cat_id,
        is_featured=bool(body.get("is_featured", False)),
        items=body.get("items", []),
    )
    db.add(c)
    await db.commit()
    return {"slug": c.slug}


@router.patch("/collections/{slug}")
async def update_collection(
    slug: str, body: dict, staff=Depends(require_staff), db: AsyncSession = Depends(get_db)
):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Koleksi tidak ditemukan")
    for k in ("title", "description_md", "cover_url", "is_featured", "items"):
        if k in body:
            setattr(c, k, body[k])
    if "category" in body:
        cat = (await db.execute(select(Category).where(Category.slug == body["category"]))).scalar_one_or_none()
        c.category_id = cat.id if cat else None
    await db.commit()
    return {"slug": c.slug}


@router.delete("/collections/{slug}", status_code=204)
async def delete_collection(slug: str, staff=Depends(require_staff), db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if c:
        await db.delete(c)
        await db.commit()


@router.get("/hub/transformer")
async def transformer_hub(db: AsyncSession = Depends(get_db)):
    cat = (
        await db.execute(
            select(Category).where(Category.slug == "transformer", Category.parent_id.is_(None))
        )
    ).scalar_one_or_none()
    if not cat:
        return {"category": None, "collections": [], "models": [], "datasets": [], "notebooks": []}

    async def top(kind: str) -> list[dict]:
        rows = (
            await db.execute(
                select(Repo)
                .options(selectinload(Repo.owner))
                .where(Repo.kind == kind, Repo.category_id == cat.id, Repo.visibility == "public")
                .order_by(Repo.downloads.desc())
                .limit(12)
            )
        ).scalars().all()
        out = []
        for r in rows:
            c_ref, s_ref = await load_category_refs(db, r.category_id, r.subcategory_id)
            out.append(to_summary(r, c_ref, s_ref))
        return out

    cols = (
        await db.execute(
            select(Collection)
            .where(Collection.category_id == cat.id, Collection.is_featured.is_(True))
            .order_by(Collection.created_at.desc())
        )
    ).scalars().all()
    nbs = (
        await db.execute(
            select(Notebook).where(Notebook.category_id == cat.id).order_by(Notebook.created_at.desc()).limit(12)
        )
    ).scalars().all()

    return {
        "category": {"slug": cat.slug, "name": cat.name, "description": cat.description or ""},
        "collections": [_summary(c) for c in cols],
        "models": await top("model"),
        "datasets": await top("dataset"),
        "notebooks": [{"id": n.id, "title": n.title} for n in nbs],
    }
