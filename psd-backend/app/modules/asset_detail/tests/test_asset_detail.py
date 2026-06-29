"""Uji logika detail aset."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.asset_detail import contributors, filetree, gitea_content, language, modelcard, versioning


def test_detect_language():
    assert language.detect_language("src/train.py") == "python"
    assert language.detect_language("README.md") == "markdown"
    assert language.detect_language("model.safetensors") == "binary"


def test_parse_front_matter():
    text = "---\nlicense: mit\n---\n# Judul\n"
    meta, body = modelcard.parse_front_matter(text)
    assert meta["license"] == "mit"
    assert body.startswith("# Judul")


def test_aggregate_contributors():
    out = contributors.aggregate_contributors(
        [{"username": "a", "commits": 5}, {"username": "b", "commits": 2}],
        [{"username": "c", "team": "Tim"}],
    )
    assert out[0]["username"] == "a"


def test_branch_name_validation():
    assert versioning.is_valid_branch_name("fitur-baru") is True
    assert versioning.is_valid_branch_name("a b") is False


def test_build_tree():
    tree = filetree.build_tree(["README.md", "src/a.py"])
    names = [n["name"] for n in tree]
    assert "src" in names and "README.md" in names


@pytest.mark.asyncio
async def test_fetch_readme_from_gitea():
    repo = MagicMock()
    repo.gitea_repo_id = 1
    repo.clone_url = "https://git.example.com/u/r.git"
    repo.gitea_owner = "u"
    repo.gitea_name = "r"
    repo.slug = "u/r"

    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.get_repo = AsyncMock(return_value={"default_branch": "main"})

    with patch("app.modules.asset_detail.gitea_content.client_or_none", return_value=client):
        with patch(
            "app.modules.asset_detail.gitea_content.files_view.get_file_text",
            new=AsyncMock(return_value="# Halo\n"),
        ):
            text = await gitea_content.fetch_readme_text(repo)
    assert text == "# Halo\n"
