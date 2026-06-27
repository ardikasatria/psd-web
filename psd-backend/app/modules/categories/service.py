from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.categories.models import Category


def category_ref(c: Category | None) -> dict | None:
    if not c:
        return None
    return {"slug": c.slug, "name": c.name}


async def get_category_by_id(db: AsyncSession, category_id: str | None) -> Category | None:
    if not category_id:
        return None
    return (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()


async def load_category_refs(
    db: AsyncSession, category_id: str | None, subcategory_id: str | None
) -> tuple[dict | None, dict | None]:
    cat = await get_category_by_id(db, category_id)
    sub = await get_category_by_id(db, subcategory_id)
    return category_ref(cat), category_ref(sub)


async def resolve_category(
    db: AsyncSession, category_slug: str | None, subcategory_slug: str | None
) -> tuple[str | None, str | None]:
    cat = sub = None
    if category_slug:
        cat = (
            await db.execute(
                select(Category).where(Category.slug == category_slug, Category.parent_id.is_(None))
            )
        ).scalar_one_or_none()
        if not cat:
            raise ApiError(422, "bad_category", "Kategori tidak dikenal")
    if subcategory_slug:
        sub = (await db.execute(select(Category).where(Category.slug == subcategory_slug))).scalar_one_or_none()
        if not sub or (cat and sub.parent_id != cat.id):
            raise ApiError(422, "bad_subcategory", "Subkategori tidak cocok dengan kategori")
        if not cat:
            parent = await get_category_by_id(db, sub.parent_id)
            if not parent:
                raise ApiError(422, "bad_subcategory", "Subkategori tidak cocok dengan kategori")
    return (cat.id if cat else None), (sub.id if sub else None)


async def apply_category_body(
    db: AsyncSession, body: dict, entity, *, clear_sub_on_main_change: bool = True
) -> None:
    if "category" not in body and "subcategory" not in body:
        return
    category_slug = body.get("category")
    subcategory_slug = body.get("subcategory")
    if category_slug is None and subcategory_slug is None:
        entity.category_id = None
        entity.subcategory_id = None
        return
    cat_id, sub_id = await resolve_category(db, category_slug, subcategory_slug)
    entity.category_id = cat_id
    if sub_id is not None:
        entity.subcategory_id = sub_id
    elif clear_sub_on_main_change and "category" in body:
        entity.subcategory_id = None


async def filter_by_category_slugs(
    db: AsyncSession,
    stmt,
    model,
    category_slug: str | None,
    subcategory_slug: str | None,
):
    if category_slug:
        cat = (
            await db.execute(
                select(Category).where(Category.slug == category_slug, Category.parent_id.is_(None))
            )
        ).scalar_one_or_none()
        if not cat:
            raise ApiError(422, "bad_category", "Kategori tidak dikenal")
        stmt = stmt.where(model.category_id == cat.id)
    if subcategory_slug:
        sub = (await db.execute(select(Category).where(Category.slug == subcategory_slug))).scalar_one_or_none()
        if not sub:
            raise ApiError(422, "bad_subcategory", "Subkategori tidak dikenal")
        if category_slug:
            cat = (
                await db.execute(
                    select(Category).where(Category.slug == category_slug, Category.parent_id.is_(None))
                )
            ).scalar_one_or_none()
            if not cat or sub.parent_id != cat.id:
                raise ApiError(422, "bad_subcategory", "Subkategori tidak cocok dengan kategori")
        stmt = stmt.where(model.subcategory_id == sub.id)
    return stmt
