import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import String, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user_optional, require_staff
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import upload_public
from app.modules.blog.models import BlogPost
from app.modules.users.models import User
from app.modules.users.refs import is_staff, owner_ref_dict

router = APIRouter(tags=["blog"])

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _summary(b: BlogPost, *, include_status: bool = False) -> dict:
    data = {
        "slug": b.slug,
        "title": b.title,
        "summary": b.summary,
        "cover_url": b.cover_url,
        "tags": b.tags or [],
        "author": owner_ref_dict(b.author),
        "published_at": b.published_at,
    }
    if include_status:
        data["status"] = b.status
    return data


@router.get("/blog")
async def list_blog(
    tag: str | None = None,
    status: str | None = None,
    p: PageParams = Depends(page_params),
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(BlogPost)
    staff = viewer and is_staff(viewer)
    if staff and status in ("draft", "all"):
        if status == "draft":
            stmt = stmt.where(BlogPost.status == "draft")
    else:
        stmt = stmt.where(BlogPost.status == "published")
    if tag:
        stmt = stmt.where(cast(BlogPost.tags, String).ilike(f'%"{tag}"%'))
    stmt = stmt.order_by(BlogPost.published_at.desc().nullslast(), BlogPost.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(b, include_status=bool(staff)) for b in rows], total, p)


@router.get("/blog/{slug}")
async def get_blog(
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if not b:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    staff = viewer and is_staff(viewer)
    if b.status != "published" and not staff:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    return {**_summary(b, include_status=bool(staff)), "body_md": b.body_md, "status": b.status}


@router.post("/blog", status_code=201)
async def create_blog(body: dict, user: User = Depends(require_staff), db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(BlogPost).where(BlogPost.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug sudah dipakai")
    b = BlogPost(
        slug=body["slug"],
        title=body["title"],
        summary=body.get("summary", ""),
        body_md=body.get("body_md", ""),
        cover_url=body.get("cover_url"),
        tags=body.get("tags", []),
        author_id=user.id,
        status="draft",
    )
    db.add(b)
    await db.commit()
    return {"slug": b.slug}


@router.patch("/blog/{slug}")
async def update_blog(slug: str, body: dict, user: User = Depends(require_staff), db: AsyncSession = Depends(get_db)):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if not b:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    for k in ("title", "summary", "body_md", "cover_url", "tags", "status"):
        if k in body:
            setattr(b, k, body[k])
    if body.get("status") == "published" and not b.published_at:
        b.published_at = datetime.now(timezone.utc)
    await db.commit()
    return {"slug": b.slug}


@router.delete("/blog/{slug}", status_code=204)
async def delete_blog(slug: str, user: User = Depends(require_staff), db: AsyncSession = Depends(get_db)):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if b:
        await db.delete(b)
        await db.commit()


@router.post("/blog/images")
async def blog_image(file: UploadFile = File(...), user: User = Depends(require_staff)):
    ext = IMG.get(file.content_type or "")
    if not ext:
        raise ApiError(422, "invalid_file", "Format jpg/png/webp")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 5 MB")
    return {"url": upload_public(f"blog/{uuid.uuid4().hex}.{ext}", data, file.content_type or "image/jpeg")}
