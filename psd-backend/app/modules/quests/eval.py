from sqlalchemy import func, select

from app.modules.competitions.models import Submission
from app.modules.community.models import Post as ForumPost, Thread
from app.modules.learn.models import Course, Enrollment, LearningPath, LessonProgress, Notebook
from app.modules.repos.models import Repo
from app.modules.social.models import Follow, Post as SocialPost


async def _course_done(db, user, slug):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        return False
    total = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    if total == 0:
        return False
    done = (
        await db.execute(
            select(func.count())
            .select_from(LessonProgress)
            .where(LessonProgress.user_id == user.id, LessonProgress.course_slug == slug)
        )
    ).scalar_one()
    return done >= total


async def eval_step(db, user, step) -> bool:
    t, target = step.get("type"), step.get("target")
    if t == "complete_profile":
        return bool(user.avatar_url) and bool(user.bio or user.about_md)
    if t == "reach_reputation":
        return (user.reputation or 0) >= int(target or 0)
    if t == "publish_asset":
        q = select(func.count()).select_from(Repo).where(Repo.owner_id == user.id)
        if target in ("dataset", "model", "project"):
            q = q.where(Repo.kind == target)
        return (await db.execute(q)).scalar_one() > 0
    if t == "create_notebook":
        return (
            await db.execute(
                select(func.count()).select_from(Notebook).where(Notebook.owner_id == user.id)
            )
        ).scalar_one() > 0
    if t == "submit_competition":
        return (
            await db.execute(
                select(func.count())
                .select_from(Submission)
                .where(Submission.user_id == user.id, Submission.status == "scored")
            )
        ).scalar_one() > 0
    if t == "make_post":
        return (
            await db.execute(select(func.count()).select_from(SocialPost).where(SocialPost.author_id == user.id))
        ).scalar_one() > 0
    if t == "make_thread":
        return (
            await db.execute(
                select(func.count()).select_from(Thread).where(
                    Thread.author_id == user.id, Thread.repo_id.is_(None)
                )
            )
        ).scalar_one() > 0
    if t == "reply_thread":
        return (
            await db.execute(select(func.count()).select_from(ForumPost).where(ForumPost.author_id == user.id))
        ).scalar_one() > 0
    if t == "follow_user":
        return (
            await db.execute(select(func.count()).select_from(Follow).where(Follow.follower_id == user.id))
        ).scalar_one() > 0
    if t == "complete_course":
        if target:
            return await _course_done(db, user, target)
        slugs = (await db.execute(select(Course.slug))).scalars().all()
        for slug in slugs:
            if await _course_done(db, user, slug):
                return True
        return False
    if t == "complete_path":
        lp = (await db.execute(select(LearningPath).where(LearningPath.slug == target))).scalar_one_or_none()
        if not lp:
            return False
        for cs in lp.course_slugs or []:
            if not await _course_done(db, user, cs):
                return False
        return bool(lp.course_slugs)
    if t == "enroll_course":
        return (
            await db.execute(
                select(func.count())
                .select_from(Enrollment)
                .where(Enrollment.user_id == user.id, Enrollment.course_slug == target)
            )
        ).scalar_one() > 0
    return False
