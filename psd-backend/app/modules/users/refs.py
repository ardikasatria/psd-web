STAFF_ROLES = frozenset({"moderator", "superadmin"})
ALLOWED_ROLES = frozenset({"member", "moderator", "superadmin"})


def is_staff(user) -> bool:
    return user.role in STAFF_ROLES


def owner_ref_dict(user) -> dict:
    return {
        "username": user.username,
        "name": user.name or None,
        "type": "org" if getattr(user, "account_type", "individual") == "organization" else "user",
        "avatar_url": user.avatar_url,
        "is_official": bool(getattr(user, "is_official", False)),
    }
