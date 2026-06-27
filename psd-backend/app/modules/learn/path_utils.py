"""Helpers for learning path items (belajar → buktikan → berpeluang)."""

from __future__ import annotations

PHASES = ("belajar", "buktikan", "berpeluang")


def normalize_items(items: list | None, course_slugs: list | None) -> list[dict]:
    if items:
        return list(items)
    return [{"phase": "belajar", "type": "course", "ref": slug} for slug in (course_slugs or [])]


def course_slugs_from_items(items: list[dict]) -> list[str]:
    return [str(i["ref"]) for i in items if i.get("type") == "course" and i.get("ref")]


def phase_counts(items: list[dict]) -> dict[str, int]:
    counts = {p: 0 for p in PHASES}
    for item in items:
        phase = item.get("phase")
        if phase in counts:
            counts[phase] += 1
    return counts


def path_summary(lp) -> dict:
    items = normalize_items(getattr(lp, "items", None), getattr(lp, "course_slugs", None))
    return {
        "slug": lp.slug,
        "title": lp.title,
        "description": lp.description,
        "courses_count": len(course_slugs_from_items(items)),
        "items_count": len(items),
        "phase_counts": phase_counts(items),
    }


def path_detail(lp) -> dict:
    items = normalize_items(getattr(lp, "items", None), getattr(lp, "course_slugs", None))
    base = path_summary(lp)
    return {
        **base,
        "course_slugs": course_slugs_from_items(items),
        "items": items,
    }


def apply_path_payload(lp, body: dict) -> None:
    if "items" in body and body["items"] is not None:
        lp.items = body["items"]
        lp.course_slugs = course_slugs_from_items(body["items"])
    elif "course_slugs" in body:
        lp.course_slugs = body["course_slugs"] or []
        if not getattr(lp, "items", None):
            lp.items = normalize_items(None, lp.course_slugs)
    for k in ("title", "description", "slug"):
        if k in body and body[k] is not None:
            setattr(lp, k, body[k])
