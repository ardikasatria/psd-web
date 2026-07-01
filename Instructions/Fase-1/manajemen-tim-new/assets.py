"""
Jenis aset tim (diperluas) & ruang diskusi (pesan + lampiran file).
"""
from __future__ import annotations

from .roles import TeamError, can

# Aset yang bisa dimiliki/dikelola tim — bukan hanya proyek/model/dataset/notebook.
TEAM_ASSET_KINDS = {
    "project", "model", "dataset", "notebook",
    "idea_space",        # ruang ide
    "data_factory",      # pabrik data
    "transformer_space",  # ruang transformer
    "model_registry",    # registry model
    "synthetic_data",    # data sintesis
    "analytics_space",   # ruang analitik
}


def is_team_asset_kind(kind: str) -> bool:
    return kind in TEAM_ASSET_KINDS


def validate_asset_kind(kind: str) -> str:
    if not is_team_asset_kind(kind):
        raise TeamError(422, "bad_asset_kind", f"Jenis aset tim tak dikenal: {kind}")
    return kind


# ---------------- diskusi ----------------
# Ekstensi berbahaya untuk lampiran (eksekusi) — tolak demi keamanan.
_BLOCKED_EXT = {"exe", "sh", "bat", "cmd", "com", "msi", "scr", "ps1", "jar", "app"}


def can_post(role: str | None) -> bool:
    return can(role, "post_discussion")


def validate_message(text: str | None, attachments: list | None) -> None:
    has_text = bool(text and text.strip())
    has_files = bool(attachments)
    if not has_text and not has_files:
        raise TeamError(422, "empty_message", "Pesan tidak boleh kosong.")


def validate_attachment(filename: str, size_bytes: int, *, max_bytes: int) -> None:
    if size_bytes <= 0:
        raise TeamError(422, "empty_file", "Berkas kosong.")
    if size_bytes > max_bytes:
        raise TeamError(413, "file_too_large",
                        f"Berkas melebihi batas ({max_bytes} byte).")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _BLOCKED_EXT:
        raise TeamError(415, "blocked_type", f"Tipe berkas tak diizinkan: .{ext}")
