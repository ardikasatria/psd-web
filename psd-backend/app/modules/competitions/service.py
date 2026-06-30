"""Helper layanan kompetisi (deadline, leaderboard, notebook)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.competitions import comp_notebooks, deadline, submission_review
from app.modules.competitions.models import Competition, CompetitionNotebook, Submission
from app.modules.competitions.scoring import higher_is_better as metric_higher_is_better
from app.modules.learn.models import Notebook
from app.modules.teams.models import Team
from app.modules.users.models import User
from app.modules.users.refs import owner_ref_dict


def competition_hib(c: Competition) -> bool:
    if c.higher_is_better is not None:
        return c.higher_is_better
    return metric_higher_is_better(c.metric)


def deadline_payload(c: Competition) -> dict:
    return deadline.progress(c.starts_at, c.ends_at, datetime.now(timezone.utc))


def submission_row_dict(s: Submission) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "team_id": s.team_id,
        "notebook_id": s.notebook_id,
        "status": s.status,
        "score": s.public_score,
        "note": s.note,
        "review_note": s.review_note,
        "submitted_at": s.created_at,
        "created_at": s.created_at,
        "filename": s.filename or "",
        "public_score": s.public_score,
    }


async def load_submission_dicts(db: AsyncSession, competition_id: str) -> list[dict]:
    rows = (
        await db.execute(select(Submission).where(Submission.competition_id == competition_id))
    ).scalars().all()
    return [submission_row_dict(s) for s in rows]


async def build_leaderboard_items(
    db: AsyncSession,
    c: Competition,
    *,
    board: str = "public",
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    rows = (
        await db.execute(
            select(Submission, User, Team)
            .join(User, Submission.user_id == User.id)
            .outerjoin(Team, Submission.team_id == Team.id)
            .where(Submission.competition_id == c.id)
        )
    ).all()

    hib = competition_hib(c)
    subs: list[dict] = []
    user_map: dict[str, User] = {}
    team_map: dict[str, Team] = {}
    for s, u, t in rows:
        user_map[u.id] = u
        if t:
            team_map[t.id] = t
        sc = s.private_score if board == "private" else s.public_score
        if s.status == submission_review.SCORED and sc is not None:
            subs.append(
                {
                    **submission_row_dict(s),
                    "score": sc,
                }
            )

    ranked = submission_review.leaderboard(subs, higher_is_better=hib)
    total = len(ranked)
    page = ranked[offset : offset + limit]
    items = []
    for row in page:
        if row.get("team_id") and row["team_id"] in team_map:
            t = team_map[row["team_id"]]
            entrant = {"kind": "team", "name": t.name, "avatar_url": t.avatar_url}
        else:
            u = user_map.get(row["user_id"])
            entrant = {
                "kind": "user",
                "name": u.username if u else "—",
                "avatar_url": getattr(u, "avatar_url", None) if u else None,
            }
        items.append(
            {
                "rank": row["rank"],
                "score": row["score"],
                "submitted_at": row["submitted_at"],
                "entrant": entrant,
                "participant": owner_ref_dict(user_map[row["user_id"]]) if row["user_id"] in user_map else None,
            }
        )
    return items, total


async def competition_detail_stats(db: AsyncSession, c: Competition) -> dict:
    subs = await load_submission_dicts(db, c.id)
    nbs = (
        await db.execute(
            select(CompetitionNotebook).where(CompetitionNotebook.competition_id == c.id)
        )
    ).scalars().all()
    nb_dicts = [{"id": n.id, "favorite_count": n.favorite_count, "updated_at": n.updated_at} for n in nbs]
    participant_ids = list(
        (await db.execute(select(Submission.user_id).where(Submission.competition_id == c.id))).scalars().all()
    )
    team_ids = list(
        (await db.execute(
            select(Submission.team_id)
            .where(Submission.competition_id == c.id, Submission.team_id.isnot(None))
            .distinct()
        )).scalars().all()
    )
    return comp_notebooks.competition_stats(
        submissions=subs,
        notebooks=nb_dicts,
        participants=participant_ids,
        teams=team_ids,
    )


async def notebook_items(
    db: AsyncSession,
    c: Competition,
    viewer: User | None,
    favorited_ids: set[str] | None = None,
) -> list[dict]:
    rows = (
        await db.execute(
            select(CompetitionNotebook, Notebook, User)
            .join(Notebook, CompetitionNotebook.notebook_id == Notebook.id)
            .join(User, CompetitionNotebook.owner_id == User.id)
            .where(CompetitionNotebook.competition_id == c.id, CompetitionNotebook.is_public.is_(True))
        )
    ).all()
    items = []
    for cn, nb, owner in rows:
        items.append(
            {
                "id": cn.id,
                "title": nb.title,
                "owner": owner_ref_dict(owner),
                "favorite_count": cn.favorite_count,
                "favorited": cn.id in (favorited_ids or set()),
                "updated_at": cn.updated_at,
                "notebook_id": nb.id,
            }
        )
    return comp_notebooks.rank_by_favorites(items)
