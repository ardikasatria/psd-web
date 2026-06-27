from collections import defaultdict

from sqlalchemy import func, select

from app.modules.community.models import ForumReaction, ForumVote

ALLOWED_EMOJIS = frozenset({"👍", "❤️", "😂", "🎉", "🤔", "👏", "🔥", "💡"})


def empty_engagement() -> dict:
    return {
        "score": 0,
        "upvotes": 0,
        "downvotes": 0,
        "user_vote": None,
        "reactions": [],
    }


async def vote_stats(db, target_type: str, target_ids: list[str], user_id: str | None) -> dict[str, dict]:
    if not target_ids:
        return {}
    rows = (
        await db.execute(
            select(
                ForumVote.target_id,
                ForumVote.value,
                func.count().label("cnt"),
            )
            .where(ForumVote.target_type == target_type, ForumVote.target_id.in_(target_ids))
            .group_by(ForumVote.target_id, ForumVote.value)
        )
    ).all()

    out: dict[str, dict] = {tid: empty_engagement() for tid in target_ids}
    for target_id, value, cnt in rows:
        if value == 1:
            out[target_id]["upvotes"] = cnt
        elif value == -1:
            out[target_id]["downvotes"] = cnt
    for tid in target_ids:
        e = out[tid]
        e["score"] = e["upvotes"] - e["downvotes"]

    if user_id:
        user_rows = (
            await db.execute(
                select(ForumVote.target_id, ForumVote.value).where(
                    ForumVote.target_type == target_type,
                    ForumVote.target_id.in_(target_ids),
                    ForumVote.user_id == user_id,
                )
            )
        ).all()
        for target_id, value in user_rows:
            out[target_id]["user_vote"] = value

    return out


async def reaction_stats(db, target_type: str, target_ids: list[str], user_id: str | None) -> dict[str, list]:
    if not target_ids:
        return {}
    rows = (
        await db.execute(
            select(
                ForumReaction.target_id,
                ForumReaction.emoji,
                func.count().label("cnt"),
            )
            .where(ForumReaction.target_type == target_type, ForumReaction.target_id.in_(target_ids))
            .group_by(ForumReaction.target_id, ForumReaction.emoji)
        )
    ).all()

    grouped: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for target_id, emoji, cnt in rows:
        grouped[target_id][emoji] = cnt

    user_reacted: dict[str, set[str]] = defaultdict(set)
    if user_id:
        user_rows = (
            await db.execute(
                select(ForumReaction.target_id, ForumReaction.emoji).where(
                    ForumReaction.target_type == target_type,
                    ForumReaction.target_id.in_(target_ids),
                    ForumReaction.user_id == user_id,
                )
            )
        ).all()
        for target_id, emoji in user_rows:
            user_reacted[target_id].add(emoji)

    out: dict[str, list] = {tid: [] for tid in target_ids}
    for tid in target_ids:
        emojis = grouped.get(tid, {})
        reacted = user_reacted.get(tid, set())
        out[tid] = [
            {"emoji": emoji, "count": count, "reacted": emoji in reacted}
            for emoji, count in sorted(emojis.items(), key=lambda x: (-x[1], x[0]))
        ]
    return out


async def engagement_for_targets(
    db, target_type: str, target_ids: list[str], user_id: str | None
) -> dict[str, dict]:
    votes = await vote_stats(db, target_type, target_ids, user_id)
    reactions = await reaction_stats(db, target_type, target_ids, user_id)
    merged = {}
    for tid in target_ids:
        base = votes.get(tid, empty_engagement())
        base["reactions"] = reactions.get(tid, [])
        merged[tid] = base
    return merged


async def engagement_for_one(db, target_type: str, target_id: str, user_id: str | None) -> dict:
    return (await engagement_for_targets(db, target_type, [target_id], user_id)).get(
        target_id, empty_engagement()
    )
