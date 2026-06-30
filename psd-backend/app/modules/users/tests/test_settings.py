"""Uji pengaturan privasi profil."""
from app.modules.users.settings import email_visible, merged


def test_email_visible_owner_always():
    settings = {"privacy": {"show_email": False}}
    assert email_visible(settings, include_email=False, viewer_id="u1", target_id="u1") is True


def test_email_visible_public_when_enabled():
    settings = {"privacy": {"show_email": True}}
    assert email_visible(settings, include_email=False, viewer_id="other", target_id="u1") is True


def test_email_visible_hidden_for_strangers():
    settings = {"privacy": {"show_email": False}}
    assert email_visible(settings, include_email=False, viewer_id="other", target_id="u1") is False


def test_merged_preserves_privacy_patch():
    out = merged({"privacy": {"show_email": True}})
    assert out["privacy"]["show_email"] is True
    assert out["privacy"]["profile_visibility"] == "public"
