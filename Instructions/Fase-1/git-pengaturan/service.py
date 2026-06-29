"""
Service kelola kunci SSH di PSD (tersinkron ke Gitea).

add_key  : validasi → cek duplikat fingerprint → tambah di Gitea → simpan ref di PSD.
remove_key: hapus di Gitea → hapus ref di PSD.
list_keys: dari store PSD (untuk tampil cepat tanpa memanggil Gitea tiap kali).
"""
from __future__ import annotations

from .sshkeys import SshKeyError, parse_public_key


class GitKeyError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def add_key(*, gitea, store, user_id: str, gitea_username: str,
            title: str, public_key: str) -> dict:
    if not title or not title.strip():
        raise GitKeyError(422, "title_required", "Judul kunci wajib diisi.")
    try:
        parsed = parse_public_key(public_key)
    except SshKeyError as e:
        raise GitKeyError(422, e.slug, e.message)

    if store.exists_fingerprint(user_id, parsed.fingerprint):
        raise GitKeyError(409, "duplicate_key", "Kunci dengan fingerprint ini sudah ada.")

    res = gitea.add_key(gitea_username, title.strip(), parsed.normalized)
    ref = {
        "id": res.get("id"),                    # id kunci di Gitea
        "title": title.strip(),
        "type": parsed.type,
        "fingerprint": parsed.fingerprint,
        "gitea_username": gitea_username,
    }
    store.save(user_id, ref)
    return ref


def remove_key(*, gitea, store, user_id: str, key_id: int) -> None:
    ref = store.get(user_id, key_id)
    if ref is None:
        raise GitKeyError(404, "not_found", "Kunci tidak ditemukan.")
    gitea.delete_key(ref["gitea_username"], key_id)
    store.delete(user_id, key_id)


def list_keys(*, store, user_id: str) -> list:
    return store.list(user_id)
