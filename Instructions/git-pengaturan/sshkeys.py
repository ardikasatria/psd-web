"""
Validasi & fingerprint kunci PUBLIK SSH (untuk disimpan di Pengaturan PSD lalu
disinkronkan ke Gitea). PSD TIDAK PERNAH menyimpan kunci privat.

Memvalidasi format OpenSSH (`<type> <base64> [comment]`), memeriksa konsistensi
nama algoritma yang tertanam di blob, dan menghitung fingerprint SHA256 (seperti
yang ditampilkan Gitea/ssh-keygen).
"""
from __future__ import annotations

import base64
import binascii
import hashlib
from dataclasses import dataclass

# Tipe kunci yang diterima.
ALLOWED_TYPES = {
    "ssh-ed25519",
    "ssh-rsa",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com",
}


class SshKeyError(ValueError):
    def __init__(self, slug: str, message: str):
        super().__init__(message)
        self.slug = slug
        self.message = message


@dataclass(frozen=True)
class ParsedKey:
    type: str
    fingerprint: str        # "SHA256:..."
    comment: str
    normalized: str         # "<type> <base64> [comment]"


def _embedded_name(blob: bytes) -> str:
    if len(blob) < 4:
        raise SshKeyError("invalid_key", "Blob kunci terlalu pendek.")
    n = int.from_bytes(blob[:4], "big")
    if n <= 0 or 4 + n > len(blob):
        raise SshKeyError("invalid_key", "Panjang nama algoritma tidak wajar.")
    return blob[4:4 + n].decode("ascii", "replace")


def parse_public_key(text: str) -> ParsedKey:
    if not text or not text.strip():
        raise SshKeyError("empty_key", "Kunci kosong.")
    parts = text.strip().split()
    if len(parts) < 2:
        raise SshKeyError("invalid_key", "Format harus: <type> <base64> [komentar].")
    key_type, b64 = parts[0], parts[1]
    comment = " ".join(parts[2:]) if len(parts) > 2 else ""

    if key_type not in ALLOWED_TYPES:
        raise SshKeyError("unsupported_type", f"Tipe kunci tak didukung: {key_type}.")
    try:
        blob = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError):
        raise SshKeyError("invalid_base64", "Bagian base64 kunci tidak valid.")

    if _embedded_name(blob) != key_type:
        raise SshKeyError("invalid_key", "Nama algoritma tidak cocok dengan isi kunci.")

    fp = "SHA256:" + base64.b64encode(hashlib.sha256(blob).digest()).decode().rstrip("=")
    normalized = f"{key_type} {b64}" + (f" {comment}" if comment else "")
    return ParsedKey(type=key_type, fingerprint=fp, comment=comment, normalized=normalized)
