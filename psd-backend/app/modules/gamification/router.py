from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.pagination import PageParams, page_params, paginated
from app.modules.gamification.models import UserBadge
from app.modules.gamification.service import BADGES
from app.modules.gamification.tiers import perks_for, tier_for
from app.modules.users.models import User
from app.modules.users.refs import owner_ref_dict

router = APIRouter(tags=["gamification"])


@router.get("/me/gamification")
async def my_gamification(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    earned = {
        b.badge_id
        for b in (
            await db.execute(select(UserBadge).where(UserBadge.user_id == user.id))
        ).scalars().all()
    }
    return {
        "tier": tier_for(user.reputation or 0),
        "perks": perks_for(user.reputation or 0),
        "badges": [
            {
                "id": badge_id,
                "name": name,
                "tier": tier,
                "description": desc,
                "earned": badge_id in earned,
            }
            for badge_id, (name, tier, desc) in BADGES.items()
        ],
    }


@router.get("/leaderboard/contributors")
async def contributors(
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.reputation.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(
        [
            {
                "rank": p.offset + i + 1,
                "reputation": u.reputation or 0,
                "tier": tier_for(u.reputation or 0)["name"],
                "user": owner_ref_dict(u),
            }
            for i, u in enumerate(rows)
        ],
        total,
        p,
    )
