"""
Uji integrasi Gitea memakai httpx.MockTransport (tanpa Gitea hidup).

Verifikasi bentuk request sisi-PSD:
  - create_user_repo → URL & payload benar.
  - change_files (migrasi) → batch operasi + base64 benar, satu commit.
  - list_files / get_diff → pemetaan respons untuk UI.
  - ensure_user idempoten saat 422.

Jalankan:
    pip install httpx pytest pytest-asyncio
    pytest -q app/gitea/tests/test_gitea.py
"""
import base64
import json

import httpx
import pytest

from app.gitea.client import GiteaClient, make_operations


def _mk(handler):
    return GiteaClient("http://gitea.local", "admintoken",
                       transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_create_user_repo_request():
    seen = {}

    def handler(req: httpx.Request):
        seen["method"] = req.method
        seen["path"] = req.url.path
        seen["body"] = json.loads(req.content)
        seen["auth"] = req.headers.get("authorization")
        return httpx.Response(201, json={"id": 7, "clone_url": "http://gitea.local/u/r.git"})

    client = _mk(handler)
    data = await client.create_user_repo("budi", "dataset-iris", private=True)
    await client.aclose()

    assert seen["method"] == "POST"
    assert seen["path"] == "/api/v1/admin/users/budi/repos"
    assert seen["auth"] == "token admintoken"
    assert seen["body"]["name"] == "dataset-iris"
    assert seen["body"]["private"] is True
    assert data == {"id": 7, "clone_url": "http://gitea.local/u/r.git"}


@pytest.mark.asyncio
async def test_change_files_batch_and_base64():
    captured = {}

    def handler(req: httpx.Request):
        captured["path"] = req.url.path
        captured["body"] = json.loads(req.content)
        return httpx.Response(201, json={"commit": {"sha": "abc"}})

    client = _mk(handler)
    files = [{"path": "main.py", "content": "print('halo')"},
             {"path": "data/x.csv", "content": "a,b\n1,2\n"}]
    ops = make_operations(files, operation="create")
    await client.change_files("budi", "dataset-iris",
                              message="Impor awal dari PSD", files=ops, branch="main")
    await client.aclose()

    body = captured["body"]
    assert captured["path"] == "/api/v1/repos/budi/dataset-iris/contents"
    assert body["branch"] == "main"
    assert body["message"] == "Impor awal dari PSD"
    assert len(body["files"]) == 2
    assert body["files"][0]["operation"] == "create"
    assert body["files"][0]["path"] == "main.py"
    # konten harus base64 dari teks asli
    assert base64.b64decode(body["files"][0]["content"]).decode() == "print('halo')"


@pytest.mark.asyncio
async def test_ensure_user_idempotent_on_conflict():
    state = {"posted": False}

    def handler(req: httpx.Request):
        if req.method == "POST" and req.url.path == "/api/v1/admin/users":
            state["posted"] = True
            return httpx.Response(422, json={"message": "user already exists"})
        if req.method == "GET" and req.url.path == "/api/v1/users/budi":
            return httpx.Response(200, json={"id": 3, "login": "budi"})
        return httpx.Response(500)

    client = _mk(handler)
    user = await client.ensure_user(username="budi", email="budi@itera.ac.id")
    await client.aclose()
    assert state["posted"] is True       # mencoba create
    assert user["login"] == "budi"       # lalu ambil yang sudah ada


@pytest.mark.asyncio
async def test_list_files_mapping():
    from app.gitea import files_view

    def handler(req: httpx.Request):
        return httpx.Response(200, json=[
            {"name": "main.py", "path": "main.py", "type": "file", "size": 12, "sha": "s1"},
            {"name": "data", "path": "data", "type": "dir", "sha": "s2"},
        ])

    client = _mk(handler)
    out = await files_view.list_files(client, "budi", "dataset-iris")
    await client.aclose()
    assert out[0] == {"name": "main.py", "path": "main.py", "type": "file",
                      "size": 12, "sha": "s1"}
    assert out[1]["type"] == "dir"


@pytest.mark.asyncio
async def test_get_diff_mapping():
    from app.gitea import files_view

    def handler(req: httpx.Request):
        assert "compare" in req.url.path
        return httpx.Response(200, json={
            "total_commits": 2,
            "files": [
                {"filename": "main.py", "status": "modified", "additions": 3, "deletions": 1},
            ],
        })

    client = _mk(handler)
    diff = await files_view.get_diff(client, "budi", "dataset-iris", "main", "fitur")
    await client.aclose()
    assert diff["total_commits"] == 2
    assert diff["files"][0]["filename"] == "main.py"
    assert diff["files"][0]["additions"] == 3


@pytest.mark.asyncio
async def test_api_error_raised():
    from app.gitea.client import GiteaError

    def handler(req: httpx.Request):
        return httpx.Response(404, text="not found")

    client = _mk(handler)
    with pytest.raises(GiteaError) as ei:
        await client.get_repo("budi", "tiada")
    await client.aclose()
    assert ei.value.status == 404
