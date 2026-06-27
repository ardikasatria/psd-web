from fastapi import APIRouter, Depends
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.categories.models import Category
from app.modules.categories.util import slugify

router = APIRouter(tags=["categories"])


@router.get("/categories")
async def list_main(db: AsyncSession = Depends(get_db)):
    mains = (
        await db.execute(select(Category).where(Category.parent_id.is_(None)).order_by(Category.name))
    ).scalars().all()
    out = []
    for m in mains:
        sub = (
            await db.execute(
                select(func.count()).select_from(Category).where(Category.parent_id == m.id)
            )
        ).scalar_one()
        out.append(
            {
                "slug": m.slug,
                "name": m.name,
                "description": m.description,
                "subcategory_count": sub,
            }
        )
    return out


@router.get("/categories/{slug}")
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    m = (
        await db.execute(
            select(Category).where(Category.slug == slug, Category.parent_id.is_(None))
        )
    ).scalar_one_or_none()
    if not m:
        raise ApiError(404, "not_found", "Kategori tidak ditemukan")
    subs = (
        await db.execute(select(Category).where(Category.parent_id == m.id).order_by(Category.name))
    ).scalars().all()
    return {
        "slug": m.slug,
        "name": m.name,
        "description": m.description,
        "subcategories": [{"slug": s.slug, "name": s.name} for s in subs],
    }


@router.post("/categories/{slug}/subcategories", status_code=201)
async def add_subcategory(
    slug: str,
    body: dict,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent = (
        await db.execute(
            select(Category).where(Category.slug == slug, Category.parent_id.is_(None))
        )
    ).scalar_one_or_none()
    if not parent:
        raise ApiError(404, "not_found", "Kategori utama tidak ditemukan")
    name = body["name"].strip()
    sub_slug = slugify(name)
    dup = (
        await db.execute(
            select(Category).where(Category.parent_id == parent.id, Category.slug == sub_slug)
        )
    ).scalar_one_or_none()
    if dup:
        raise ApiError(409, "subcategory_exists", f"Subkategori '{dup.name}' sudah ada di {parent.name}")
    c = Category(slug=sub_slug, name=name, parent_id=parent.id, created_by=user.id)
    db.add(c)
    await db.commit()
    return {"slug": c.slug, "name": c.name, "parent": parent.slug}


@router.post("/admin/categories", status_code=201, dependencies=[Depends(require_staff)])
async def create_main(body: dict, db: AsyncSession = Depends(get_db)):
    s = slugify(body["name"])
    if (
        await db.execute(select(Category).where(Category.slug == s, Category.parent_id.is_(None)))
    ).scalar_one_or_none():
        raise ApiError(409, "exists", "Kategori utama sudah ada")
    c = Category(
        slug=s,
        name=body["name"].strip(),
        description=body.get("description", ""),
        parent_id=None,
    )
    db.add(c)
    await db.commit()
    return {"slug": c.slug}


@router.patch("/admin/categories/{slug}", dependencies=[Depends(require_staff)])
async def update_main(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    c = (
        await db.execute(
            select(Category).where(Category.slug == slug, Category.parent_id.is_(None))
        )
    ).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kategori tidak ditemukan")
    if "name" in body:
        c.name = body["name"].strip()
    if "description" in body:
        c.description = body["description"]
    await db.commit()
    return {"slug": c.slug}


@router.delete("/admin/categories/{slug}", status_code=204, dependencies=[Depends(require_staff)])
async def delete_category(slug: str, db: AsyncSession = Depends(get_db)):
    c = (
        await db.execute(select(Category).where(Category.slug == slug, Category.parent_id.is_(None)))
    ).scalar_one_or_none()
    if c:
        await db.execute(delete(Category).where(Category.parent_id == c.id))
        await db.delete(c)
        await db.commit()
