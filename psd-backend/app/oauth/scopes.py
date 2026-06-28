"""Definisi scope PSD OAuth/OIDC."""

SCOPES: dict[str, str] = {
    "openid": "Identitas dasar (OpenID Connect).",
    "profile": "Nama, username, dan foto profil Anda.",
    "email": "Alamat email dan status verifikasinya.",
    "offline_access": "Akses berkelanjutan saat Anda sedang tidak aktif (refresh token).",
    "repo:read": "Membaca repository Anda.",
    "repo:write": "Membuat & mengubah repository Anda.",
    "dataset:read": "Membaca dataset Anda.",
}

ACTIVE_NOW = {"openid", "profile", "email", "offline_access"}


def validate_scope(requested: str, allowed: set[str]) -> str:
    req = [s for s in (requested or "").split() if s]
    if not req:
        return "openid"
    unknown = [s for s in req if s not in SCOPES]
    if unknown:
        raise ValueError(f"scope tidak dikenal: {' '.join(unknown)}")
    forbidden = [s for s in req if s not in allowed]
    if forbidden:
        raise ValueError(f"scope di luar izin klien: {' '.join(forbidden)}")
    return " ".join(dict.fromkeys(req))
