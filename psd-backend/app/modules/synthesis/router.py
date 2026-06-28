from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.search import index_repo
from app.modules.categories.util import slugify
from app.modules.repos.models import Repo
from app.modules.synthesis.models import SynthesisJob
from app.modules.synthesis.quota import quota_for
from app.tasks.dispatch import submit_synthesis
from app.modules.teams.deps import membership
from app.modules.teams.models import Team
from app.modules.users.models import User

router = APIRouter(tags=["synthesis"])


def _day_start():
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


async def _plans_used_today(db: AsyncSession, user_id: str) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(SynthesisJob)
            .where(
                SynthesisJob.user_id == user_id,
                SynthesisJob.used_llm.is_(True),
                SynthesisJob.created_at >= _day_start(),
            )
        )
    ).scalar_one()


def _ser(j: SynthesisJob) -> dict:
    return {
        "id": j.id,
        "status": j.status,
        "prompt": j.prompt,
        "spec": j.spec,
        "n_rows": j.n_rows,
        "result_url": j.result_url,
        "preview": j.preview,
        "dataset_slug": j.dataset_slug,
        "error": j.error,
    }


@router.get("/me/synthesis/quota")
async def my_quota(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cfg = quota_for(user)
    used = await _plans_used_today(db, user.id)
    return {
        "plans_per_day": cfg["plans_per_day"],
        "plans_used": used,
        "plans_left": max(cfg["plans_per_day"] - used, 0),
        "max_rows": cfg["max_rows"],
    }


@router.post("/synthesis/jobs", status_code=202)
async def create_job(
    body: dict,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = quota_for(user)
    n_rows = min(int(body.get("n_rows", 1000)), cfg["max_rows"])
    has_spec = bool(body.get("spec"))
    if not has_spec:
        if not body.get("prompt"):
            raise ApiError(422, "no_input", "Beri prompt atau spec")
        used = await _plans_used_today(db, user.id)
        if used >= cfg["plans_per_day"]:
            raise ApiError(
                429,
                "quota_exceeded",
                f"Kuota sintesis harian habis ({cfg['plans_per_day']}). Naik tier dengan berkontribusi untuk kuota lebih besar.",
            )
    team_id = body.get("team_id")
    if team_id:
        t = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
        if not t:
            raise ApiError(404, "not_found", "Tim tidak ditemukan")
        if not await membership(db, t.id, user.id):
            raise ApiError(403, "forbidden", "Bukan anggota tim")
    job = SynthesisJob(
        user_id=user.id,
        team_id=team_id,
        status="queued",
        prompt=body.get("prompt"),
        spec=body.get("spec"),
        n_rows=n_rows,
        used_llm=not has_spec,
    )
    db.add(job)
    await db.commit()
    extra = submit_synthesis(job.id, bg)
    return {"job_id": job.id, "status": job.status, **extra}


@router.get("/synthesis/jobs/{jid}")
async def job_status(
    jid: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = (
        await db.execute(
            select(SynthesisJob).where(SynthesisJob.id == jid, SynthesisJob.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not j:
        raise ApiError(404, "not_found", "Job tidak ditemukan")
    return _ser(j)


@router.get("/me/synthesis/jobs")
async def my_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(SynthesisJob)
            .where(SynthesisJob.user_id == user.id)
            .order_by(SynthesisJob.created_at.desc())
            .limit(30)
        )
    ).scalars().all()
    return {"items": [_ser(j) for j in rows]}


@router.post("/synthesis/jobs/{jid}/publish")
async def publish_dataset(
    jid: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = (
        await db.execute(
            select(SynthesisJob).where(SynthesisJob.id == jid, SynthesisJob.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not j or j.status != "done":
        raise ApiError(400, "not_ready", "Job belum selesai")
    if j.dataset_slug:
        return {"dataset_slug": j.dataset_slug}

    spec = j.spec or {}
    raw_name = body.get("name") or spec.get("name") or f"synthetic-{j.id[-8:]}"
    repo_name = slugify(str(raw_name))[:64] or "dataset-sintesis"
    visibility = body.get("visibility", "public")
    description = spec.get("description") or j.prompt or "Dataset sintesis"

    existing = (
        await db.execute(
            select(Repo).where(Repo.slug == f"{user.username}/{repo_name}", Repo.kind == "dataset")
        )
    ).scalar_one_or_none()
    if existing:
        repo_name = f"{repo_name}-{j.id[-6:]}"

    csv_name = f"{repo_name}.csv"
    r = Repo(
        kind="dataset",
        owner_id=user.id,
        name=repo_name,
        slug=f"{user.username}/{repo_name}",
        description=description,
        tags=["synthetic", "sintesis"],
        visibility=visibility,
        synthetic=True,
        generation_spec=j.spec,
        readme_md=(
            f"# {raw_name}\n\n"
            "> **Data Sintesis** — dataset buatan untuk eksperimen/ prototyping, "
            "bukan data resmi (BPS, BMKG, atau instansi pemerintah).\n\n"
            "Spesifikasi generator tersimpan di metadata `generation_spec` untuk reproduksi."
        ),
        license="CC-BY-4.0",
        files=[
            {
                "path": csv_name,
                "size_bytes": 0,
                "type": "text/csv",
                "url": j.result_url,
            }
        ],
        team_id=j.team_id,
    )
    db.add(r)
    await db.flush()
    j.dataset_slug = r.slug
    await db.commit()
    await db.refresh(r, ["owner"])
    try:
        index_repo(r)
    except Exception:
        pass
    return {"dataset_slug": r.slug}
