from sqlalchemy import func, select

from app.modules.community.models import Thread
from app.modules.gamification.models import UserBadge
from app.modules.gamification.tiers import tier_for
from app.modules.learn.models import Course
from app.modules.repos.models import Repo
from app.modules.social.models import Follow
from app.modules.users.models import User
from psd_gamification.badges import achievement_badges
from psd_gamification.points import reputation_points

POINTS = reputation_points()
BADGES = achievement_badges()


async def award_reputation(db, user: User, reason: str, points: int | None = None) -> None:
    pts = points if points is not None else POINTS.get(reason, 0)
    if pts <= 0:
        return
    user.reputation = (user.reputation or 0) + pts
    await db.commit()


async def award_badge(db, user_id: str, badge_id: str) -> None:
    if badge_id not in BADGES:
        return
    exists = (
        await db.execute(
            select(UserBadge).where(UserBadge.user_id == user_id, UserBadge.badge_id == badge_id)
        )
    ).scalar_one_or_none()
    if not exists:
        db.add(UserBadge(user_id=user_id, badge_id=badge_id))
        await db.commit()


async def earned_badge_ids(db, user_id: str) -> list[str]:
    rows = (
        await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user_id))
    ).scalars().all()
    return list(rows)


async def profile_gamification(db, user: User) -> dict:
    badges = await earned_badge_ids(db, user.id)
    rep = user.reputation or 0
    return {
        "reputation": rep,
        "tier": tier_for(rep),
        "badges": badges,
    }


async def after_repo_created(db, user: User) -> None:
    count = (
        await db.execute(select(func.count()).select_from(Repo).where(Repo.owner_id == user.id))
    ).scalar_one()
    await award_reputation(db, user, "asset_published")
    if count == 1:
        await award_badge(db, user.id, "langkah-pertama")


async def after_repo_liked(db, repo: Repo, liker: User) -> None:
    if repo.owner_id == liker.id:
        return
    owner = (
        await db.execute(select(User).where(User.id == repo.owner_id))
    ).scalar_one_or_none()
    if not owner:
        return
    await award_reputation(db, owner, "like_received")
    if repo.likes >= 50:
        await award_badge(db, owner.id, "populer")


async def after_course_published(db, user: User) -> None:
    count = (
        await db.execute(
            select(func.count()).select_from(Course).where(
                Course.author_id == user.id, Course.status == "published"
            )
        )
    ).scalar_one()
    if count == 1:
        await award_badge(db, user.id, "berbagi-ilmu")


async def after_forum_thread(db, user: User) -> None:
    await award_reputation(db, user, "forum_thread")
    count = (
        await db.execute(select(func.count()).select_from(Thread).where(Thread.author_id == user.id))
    ).scalar_one()
    if count >= 10:
        await award_badge(db, user.id, "kontributor-aktif")


async def after_forum_post(db, user: User) -> None:
    await award_reputation(db, user, "forum_post")


async def after_follow(db, target: User) -> None:
    await award_reputation(db, target, "follow_received")
    followers = (
        await db.execute(
            select(func.count()).select_from(Follow).where(Follow.following_id == target.id)
        )
    ).scalar_one()
    if followers >= 10:
        await award_badge(db, target.id, "terhubung")
    if followers >= 500:
        await award_badge(db, target.id, "berpengaruh")


async def after_post_liked(db, author: User, like_count: int) -> None:
    await award_reputation(db, author, "post_like_received")
    if like_count >= 25:
        await award_badge(db, author.id, "ramai")


async def after_comment(db, user: User) -> None:
    await award_reputation(db, user, "comment_made")
