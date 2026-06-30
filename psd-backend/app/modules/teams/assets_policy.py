"""Kebijakan aset tim & lampiran diskusi."""
from __future__ import annotations

from app.core.errors import ApiError
from app.modules.teams.roles import can

TEAM_ASSET_KINDS = {
    "project",
    "model",
    "dataset",
    "notebook",
    "idea_space",
    "data_factory",
    "transformer_space",
    "model_registry",
    "synthetic_data",
    "analytics_space",
    "competition",
}

_BLOCKED_EXT = {"exe", "sh", "bat", "cmd", "com", "msi", "scr", "ps1", "jar", "app"}
MAX_TEAM_FILE_BYTES = 25 * 1024 * 1024


def is_team_asset_kind(kind: str) -> bool:
    return kind in TEAM_ASSET_KINDS


def validate_asset_kind(kind: str) -> str:
    if not is_team_asset_kind(kind):
        raise ApiError(422, "bad_asset_kind", f"Jenis aset tim tidak dikenal: {kind}")
    return kind


def can_post(role: str | None) -> bool:
    return can(role, "post_discussion")


def validate_message(text: str | None, attachments: list | None) -> None:
    has_text = bool(text and text.strip())
    has_files = bool(attachments)
    if not has_text and not has_files:
        raise ApiError(422, "empty_message", "Pesan tidak boleh kosong.")


def validate_attachment(filename: str, size_bytes: int, *, max_bytes: int = MAX_TEAM_FILE_BYTES) -> None:
    if size_bytes <= 0:
        raise ApiError(422, "empty_file", "Berkas kosong.")
    if size_bytes > max_bytes:
        raise ApiError(413, "file_too_large", f"Berkas melebihi batas ({max_bytes // (1024 * 1024)} MB).")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _BLOCKED_EXT:
        raise ApiError(415, "blocked_type", f"Tipe berkas tidak diizinkan: .{ext}")
