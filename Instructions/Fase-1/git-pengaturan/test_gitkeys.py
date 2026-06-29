"""Uji kelola kunci SSH PSD↔Gitea."""
import base64
import hashlib

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

from app.gitkeys import service, sshkeys
from app.gitkeys.gitea import GiteaKeysClient
from app.gitkeys.service import GitKeyError
from app.gitkeys.sshkeys import SshKeyError


def make_key(comment="budi@itera.ac.id"):
    pub = ed25519.Ed25519PrivateKey.generate().public_key()
    ob = pub.public_bytes(serialization.Encoding.OpenSSH, serialization.PublicFormat.OpenSSH).decode()
    return f"{ob} {comment}" if comment else ob


# -------------------- validasi & fingerprint --------------------
def test_parse_valid_ed25519():
    key = make_key()
    p = sshkeys.parse_public_key(key)
    assert p.type == "ssh-ed25519"
    assert p.fingerprint.startswith("SHA256:")
    assert p.comment == "budi@itera.ac.id"
    # fingerprint cocok dengan perhitungan independen
    blob = base64.b64decode(key.split()[1])
    expect = "SHA256:" + base64.b64encode(hashlib.sha256(blob).digest()).decode().rstrip("=")
    assert p.fingerprint == expect


def test_parse_rejects_garbage():
    for bad in ["", "halo dunia", "ssh-ed25519 bukanbase64!!", "ssh-unknown AAAA"]:
        with pytest.raises(SshKeyError):
            sshkeys.parse_public_key(bad)


def test_parse_rejects_mismatched_algo():
    # base64 valid tapi blob mengklaim algoritma lain
    key = make_key()
    b64 = key.split()[1]
    with pytest.raises(SshKeyError):
        sshkeys.parse_public_key(f"ssh-rsa {b64}")   # type≠embedded name


# -------------------- klien Gitea --------------------
def test_gitea_client_add_and_delete():
    seen = {}

    def handler(req: httpx.Request):
        seen[(req.method, req.url.path)] = True
        if req.method == "POST":
            return httpx.Response(201, json={"id": 7, "title": "Laptop"})
        if req.method == "DELETE":
            return httpx.Response(204)
        return httpx.Response(404)

    c = GiteaKeysClient("http://gitea", "adm", transport=httpx.MockTransport(handler))
    out = c.add_key("budi", "Laptop", make_key())
    assert out["id"] == 7
    assert ("POST", "/api/v1/admin/users/budi/keys") in seen
    c.delete_key("budi", 7)
    assert ("DELETE", "/api/v1/admin/users/budi/keys/7") in seen


# -------------------- service --------------------
class FakeStore:
    def __init__(self): self._d = {}
    def exists_fingerprint(self, uid, fp): return any(r["fingerprint"] == fp for r in self._d.values())
    def save(self, uid, ref): self._d[ref["id"]] = ref
    def get(self, uid, kid): return self._d.get(kid)
    def list(self, uid): return list(self._d.values())
    def delete(self, uid, kid): self._d.pop(kid, None)


class FakeGitea:
    def __init__(self): self.added = []; self.deleted = []; self._id = 100
    def add_key(self, username, title, key):
        self._id += 1; self.added.append((username, title)); return {"id": self._id}
    def delete_key(self, username, kid): self.deleted.append((username, kid))


def test_service_add_then_remove():
    store, gitea = FakeStore(), FakeGitea()
    ref = service.add_key(gitea=gitea, store=store, user_id="u", gitea_username="budi",
                          title="Laptop", public_key=make_key())
    assert ref["fingerprint"].startswith("SHA256:")
    assert gitea.added == [("budi", "Laptop")]
    assert len(store.list("u")) == 1
    service.remove_key(gitea=gitea, store=store, user_id="u", key_id=ref["id"])
    assert gitea.deleted and store.list("u") == []


def test_service_rejects_duplicate_fingerprint():
    store, gitea = FakeStore(), FakeGitea()
    key = make_key()
    service.add_key(gitea=gitea, store=store, user_id="u", gitea_username="budi",
                    title="A", public_key=key)
    with pytest.raises(GitKeyError) as e:
        service.add_key(gitea=gitea, store=store, user_id="u", gitea_username="budi",
                        title="B", public_key=key)
    assert e.value.status == 409 and e.value.slug == "duplicate_key"


def test_service_rejects_invalid_key_and_empty_title():
    store, gitea = FakeStore(), FakeGitea()
    with pytest.raises(GitKeyError) as e1:
        service.add_key(gitea=gitea, store=store, user_id="u", gitea_username="budi",
                        title="A", public_key="sampah")
    assert e1.value.status == 422
    with pytest.raises(GitKeyError) as e2:
        service.add_key(gitea=gitea, store=store, user_id="u", gitea_username="budi",
                        title="  ", public_key=make_key())
    assert e2.value.slug == "title_required"


def test_remove_missing_key():
    store, gitea = FakeStore(), FakeGitea()
    with pytest.raises(GitKeyError) as e:
        service.remove_key(gitea=gitea, store=store, user_id="u", key_id=999)
    assert e.value.status == 404
