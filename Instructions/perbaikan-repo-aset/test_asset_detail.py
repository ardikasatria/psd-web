"""Uji logika detail aset (GitHub + HF)."""
from app.asset_detail import (
    contributors,
    filetree,
    language,
    modelcard,
    versioning,
)


# -------------------- bahasa --------------------
def test_detect_language():
    assert language.detect_language("src/train.py") == "python"
    assert language.detect_language("README.md") == "markdown"
    assert language.detect_language("Dockerfile") == "dockerfile"
    assert language.detect_language("model.safetensors") == "binary"
    assert language.detect_language("notes") == "text"
    assert language.is_notebook("a/b.ipynb") is True
    assert language.is_binary("w.parquet") is True


# -------------------- front-matter kartu --------------------
def test_parse_front_matter_hf_card():
    text = (
        "---\n"
        "license: mit\n"
        "tags:\n  - text-classification\n  - indonesian\n"
        "language: id\n"
        "---\n"
        "# Model Saya\n\nDeskripsi.\n"
    )
    meta, body = modelcard.parse_front_matter(text)
    assert meta["license"] == "mit"
    assert "indonesian" in meta["tags"]
    assert body.startswith("# Model Saya")
    assert modelcard.card_summary(meta)["language"] == "id"


def test_parse_front_matter_none():
    meta, body = modelcard.parse_front_matter("# Tanpa front-matter\n\nisi")
    assert meta == {} and body.startswith("# Tanpa")


# -------------------- kontributor --------------------
def test_aggregate_contributors_merges_and_sorts():
    commits = [
        {"username": "ardika", "commits": 12, "avatar_url": "a.png"},
        {"username": "budi", "commits": 5},
        {"username": "ardika", "commits": 3},          # akumulasi → 15
    ]
    teams = [
        {"username": "citra", "team": "Riset AI", "avatar_url": "c.png"},  # anggota tim, 0 commit
        {"username": "budi", "team": "Riset AI"},
    ]
    out = contributors.aggregate_contributors(commits, teams)
    by = {c["username"]: c for c in out}
    assert by["ardika"]["commits"] == 15
    assert by["citra"]["commits"] == 0 and by["citra"]["is_team_member"] is True
    assert by["budi"]["is_team_member"] is True and by["budi"]["team"] == "Riset AI"
    # urut menurun jumlah commit
    assert [c["username"] for c in out][0] == "ardika"
    assert out[-1]["commits"] == 0


# -------------------- versi & branch --------------------
def test_branch_name_validation():
    assert versioning.is_valid_branch_name("fitur-baru") is True
    assert versioning.is_valid_branch_name("feature/login") is True
    assert versioning.is_valid_branch_name("rilis.v1") is True
    for bad in ["", "..", "a b", "a..b", "/x", "x/", "x.lock", "a~b", "a:b", ".hidden"]:
        assert versioning.is_valid_branch_name(bad) is False, bad


def test_default_branch_pick():
    assert versioning.default_branch(["dev", "main", "x"]) == "main"
    assert versioning.default_branch(["master", "dev"]) == "master"
    assert versioning.default_branch(["dev", "x"], configured="dev") == "dev"
    assert versioning.default_branch(["satu"]) == "satu"
    assert versioning.default_branch([]) is None


def test_sort_versions():
    tags = ["v1.0.0", "v1.2.0", "v1.10.0", "v0.9.5", "rilis"]
    assert versioning.sort_versions(tags)[:3] == ["v1.10.0", "v1.2.0", "v1.0.0"]


# -------------------- pohon berkas --------------------
def test_build_tree_dirs_first():
    paths = ["README.md", "src/train.py", "src/utils/io.py", "data/x.csv"]
    tree = filetree.build_tree(paths)
    names = [n["name"] for n in tree]
    assert names == ["data", "src", "README.md"]          # folder dulu, lalu berkas
    src = next(n for n in tree if n["name"] == "src")
    assert src["type"] == "dir"
    assert [c["name"] for c in src["children"]] == ["utils", "train.py"]
