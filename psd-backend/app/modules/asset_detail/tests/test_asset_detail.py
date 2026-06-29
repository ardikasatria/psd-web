"""Uji logika detail aset."""
from app.modules.asset_detail import contributors, filetree, language, modelcard, versioning


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
