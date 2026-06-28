"""
Uji alur kontribusi (Langkah 51) dengan httpx.MockTransport — tanpa Gitea hidup.

Verifikasi:
  - Bentuk request fork / create_branch / create_pull (head lintas-fork) / review / merge.
  - Orkestrasi open_contribution: urutan fork→branch→commit→PR + notifikasi pr_opened.
  - submit_review menotifikasi penulis; merge_contribution gating mergeable.
  - pr_view: can_merge=False bila ada REQUEST_CHANGES.
"""
import json

import httpx
import pytest

from app.contrib import contrib, pr_view
from app.contrib.client import GiteaError, GiteaPRClient


def route(req: httpx.Request):
    """Router tiruan minimal untuk endpoint Gitea yang dipakai."""
    p, m = req.url.path, req.method
    body = json.loads(req.content) if req.content else {}
    if m == "POST" and p.endswith("/forks"):
        return httpx.Response(202, json={"id": 99, "owner": {"login": "budi"}, "name": "iris"})
    if m == "GET" and p == "/api/v1/repos/budi/iris":
        return httpx.Response(200, json={"id": 99, "owner": {"login": "budi"}, "name": "iris"})
    if m == "POST" and p.endswith("/branches"):
        return httpx.Response(201, json={"name": body.get("new_branch_name")})
    if m == "POST" and p.endswith("/contents"):
        return httpx.Response(201, json={"commit": {"sha": "c1"}})
    if m == "POST" and p.endswith("/pulls"):
        return httpx.Response(201, json={"number": 5, "title": body.get("title"),
                                         "head": {"label": body.get("head")}})
    if m == "GET" and p == "/api/v1/repos/lab/iris/pulls/5":
        return httpx.Response(200, json={"number": 5, "user": {"login": "budi"},
                                         "mergeable": True, "merged": False, "state": "open",
                                         "title": "Tambah fitur"})
    if m == "POST" and p.endswith("/pulls/5/reviews"):
        return httpx.Response(200, json={"id": 1, "state": body.get("event")})
    if m == "POST" and p.endswith("/pulls/5/merge"):
        return httpx.Response(200, json={})
    return httpx.Response(404, text=f"unrouted {m} {p}")


def mk():
    return GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(route))


@pytest.mark.asyncio
async def test_create_pull_cross_fork_head():
    seen = {}

    def handler(req):
        if req.url.path.endswith("/pulls"):
            seen.update(json.loads(req.content))
        return route(req)

    client = GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(handler))
    await client.create_pull("lab", "iris", title="X", head="budi:fitur", base="main")
    await client.aclose()
    assert seen["head"] == "budi:fitur"
    assert seen["base"] == "main"


@pytest.mark.asyncio
async def test_merge_payload_uses_Do_field():
    seen = {}

    def handler(req):
        if req.url.path.endswith("/merge"):
            seen.update(json.loads(req.content))
        return route(req)

    client = GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(handler))
    ok = await client.merge_pull("lab", "iris", 5, method="squash", delete_branch=True)
    await client.aclose()
    assert ok is True
    assert seen["Do"] == "squash"
    assert seen["delete_branch_after_merge"] is True


@pytest.mark.asyncio
async def test_open_contribution_full(monkeypatch):
    from app.contrib import seams
    monkeypatch.setattr(seams, "contributor_namespace", lambda uid: "budi")
    monkeypatch.setattr(seams, "repo_owner_user", lambda o, r: "owner-1")

    order, notes = [], []

    def handler(req):
        p = req.url.path
        for key in ("forks", "branches", "contents", "pulls"):
            if p.endswith(key):
                order.append(key)
        return route(req)

    client = GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(handler))
    pr = await contrib.open_contribution(
        client, "lab", "iris", contributor_user_id="u1",
        title="Tambah fitur", work_branch="fitur",
        files=[{"path": "main.py", "content": "x=1"}],
        notify=lambda uid, kind, payload: notes.append((uid, kind)),
    )
    await client.aclose()
    assert order == ["forks", "branches", "contents", "pulls"]
    assert pr["number"] == 5
    assert ("owner-1", "pr_opened") in notes


@pytest.mark.asyncio
async def test_submit_review_notifies_author(monkeypatch):
    from app.contrib import seams
    monkeypatch.setattr(seams, "pull_author_user", lambda pr: "budi")
    notes = []
    client = mk()
    await contrib.submit_review(client, "lab", "iris", 5, event="APPROVE",
                                notify=lambda uid, kind, p: notes.append((uid, kind)))
    await client.aclose()
    assert ("budi", "pr_reviewed") in notes


@pytest.mark.asyncio
async def test_merge_gating_blocks_unmergeable(monkeypatch):
    from app.contrib import seams
    monkeypatch.setattr(seams, "pull_author_user", lambda pr: "budi")

    def handler(req):
        if req.url.path == "/api/v1/repos/lab/iris/pulls/5" and req.method == "GET":
            return httpx.Response(200, json={"number": 5, "user": {"login": "budi"},
                                             "mergeable": False, "merged": False})
        return route(req)

    client = GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(handler))
    with pytest.raises(GiteaError):
        await contrib.merge_contribution(client, "lab", "iris", 5, notify=lambda *a: None)
    await client.aclose()


@pytest.mark.asyncio
async def test_pr_view_can_merge_logic():
    def handler(req):
        p = req.url.path
        if p.endswith("/pulls/5") and req.method == "GET":
            return httpx.Response(200, json={"number": 5, "title": "X", "state": "open",
                                             "merged": False, "mergeable": True,
                                             "user": {"login": "budi"}})
        if p.endswith("/pulls/5/reviews"):
            return httpx.Response(200, json=[
                {"state": "APPROVED"}, {"state": "REQUEST_CHANGES"}])
        return route(req)

    client = GiteaPRClient("http://gitea.local", "tok", transport=httpx.MockTransport(handler))
    detail = await pr_view.pull_detail(client, "lab", "iris", 5)
    await client.aclose()
    assert detail["reviews"]["approved"] == 1
    assert detail["reviews"]["changes_requested"] == 1
    assert detail["can_merge"] is False     # ada REQUEST_CHANGES → blokir
