"""Definisi scope PSD.

Aktif sekarang (Langkah 48): openid, profile, email, offline_access.
Scope sumber daya (repo:*, dataset:*) sudah didefinisikan tapi baru BERMAKNA
saat integrasi Gitea (Langkah 50) / dataset. Didaftarkan dini agar discovery
doc & UI consent stabil.
"""

SCOPES: dict[str, str] = {
    "openid": "Identitas dasar (OpenID Connect).",
    "profile": "Nama, username, dan foto profil Anda.",
    "email": "Alamat email dan status verifikasinya.",
    "offline_access": "Akses berkelanjutan saat Anda sedang tidak aktif (refresh token).",
    # --- belum aktif pada Langkah 48 ---
    "repo:read": "Membaca repository Anda.",
    "repo:write": "Membuat & mengubah repository Anda.",
    "dataset:read": "Membaca dataset Anda.",
}

ACTIVE_NOW = {"openid", "profile", "email", "offline_access"}


def validate_scope(requested: str, allowed: set[str]) -> str:
    """Kembalikan scope ter-normalisasi (deduplikasi, urutan dijaga).

    Raise ValueError bila ada scope tak dikenal atau di luar izin klien.
    """
    req = [s for s in (requested or "").split() if s]
    if not req:
        # Default minimal: identitas saja. Sesuaikan bila ingin menolak scope kosong.
        return "openid"
    unknown = [s for s in req if s not in SCOPES]
    if unknown:
        raise ValueError(f"scope tidak dikenal: {' '.join(unknown)}")
    forbidden = [s for s in req if s not in allowed]
    if forbidden:
        raise ValueError(f"scope di luar izin klien: {' '.join(forbidden)}")
    # deduplikasi, jaga urutan
    return " ".join(dict.fromkeys(req))
