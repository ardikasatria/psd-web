from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.users.settings import email_visible


class LinkItem(BaseModel):
    label: str
    url: str


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    name: str
    email: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    accent_color: str | None = None
    pronouns: str | None = None
    location: str | None = None
    bio: str | None = None
    about_md: str | None = None
    status_emoji: str | None = None
    status_text: str | None = None
    links: list[LinkItem] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    onboarded: bool = False
    is_official: bool = False
    account_type: Literal["individual", "organization"] = "individual"
    role: Literal["member", "moderator", "superadmin"]
    is_instructor: bool = False
    email_verified: bool = False
    created_at: datetime

    @classmethod
    def from_user(cls, user, *, include_email: bool = False, viewer=None) -> "ProfileOut":
        raw_links = user.links if user.links is not None else []
        links = [LinkItem.model_validate(item) for item in raw_links]
        viewer_id = getattr(viewer, "id", None) if viewer is not None else None
        show = email_visible(
            getattr(user, "settings", None),
            include_email=include_email,
            viewer_id=viewer_id,
            target_id=user.id,
        )
        return cls(
            id=user.id,
            username=user.username,
            name=user.name,
            email=user.email if show else None,
            avatar_url=user.avatar_url,
            banner_url=user.banner_url,
            accent_color=user.accent_color,
            pronouns=user.pronouns,
            location=user.location,
            bio=user.bio,
            about_md=user.about_md,
            status_emoji=user.status_emoji,
            status_text=user.status_text,
            links=links,
            interests=user.interests if user.interests is not None else [],
            onboarded=user.onboarded,
            is_official=bool(getattr(user, "is_official", False)),
            account_type=getattr(user, "account_type", "individual"),
            role=user.role,
            is_instructor=bool(getattr(user, "is_instructor", False)),
            email_verified=user.email_verified,
            created_at=user.created_at,
        )


class ProfileUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    about_md: str | None = None
    pronouns: str | None = None
    location: str | None = None
    accent_color: str | None = None
    status_emoji: str | None = None
    status_text: str | None = None
    links: list[LinkItem] | None = None
    interests: list[str] | None = None


class UserOut(ProfileOut):
    """Backward-compatible alias for auth responses."""
