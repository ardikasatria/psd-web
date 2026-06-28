from app.modules.users.refs import STAFF_ROLES

DEFAULT_SETTINGS = {
    "notifications": {
        "email_event_reminder": True,
        "email_competition": True,
        "email_forum_reply": True,
        "inapp": True,
    },
    "email": {
        "email_enabled": True,
        "default_mode": "immediate",
        "events": {},
    },
    "privacy": {
        "profile_visibility": "public",
        "show_email": False,
        "searchable": True,
        "activity_tracking": True,
    },
    "appearance": {
        "theme": "system",
        "language": "id",
        "reduced_motion": False,
    },
}


def merged(user_settings: dict | None) -> dict:
    out = {k: {**v} for k, v in DEFAULT_SETTINGS.items()}
    for section, vals in (user_settings or {}).items():
        if section in out and isinstance(vals, dict):
            out[section].update(vals)
    return out


def can_view_profile(target_settings: dict | None, viewer_id: str | None, target_id: str, viewer_role: str | None) -> bool:
    if merged(target_settings)["privacy"]["profile_visibility"] == "public":
        return True
    if viewer_id == target_id:
        return True
    if viewer_role in STAFF_ROLES:
        return True
    return False


def is_searchable(user_settings: dict | None) -> bool:
    return bool(merged(user_settings)["privacy"]["searchable"])


def email_visible(user_settings: dict | None, *, include_email: bool, viewer_id: str | None, target_id: str) -> bool:
    if include_email or viewer_id == target_id:
        return True
    return bool(merged(user_settings)["privacy"]["show_email"])
