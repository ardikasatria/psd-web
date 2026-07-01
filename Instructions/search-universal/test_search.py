"""Uji pencarian universal."""
from app.search import query, relevance
from app.search.engine import SearchEngine


# -------------------- parsing --------------------
def test_parse_query_operators():
    p = query.parse_query("prediksi type:kompetisi #umkm owner:ardika")
    assert p["text"] == "prediksi"
    assert p["filters"]["type"] == "competition"      # alias ID → kanonik
    assert p["filters"]["tags"] == ["umkm"]
    assert p["filters"]["owner"] == "ardika"


def test_parse_at_user():
    p = query.parse_query("@ardika")
    assert p["filters"]["type"] == "user" and p["text"] == "ardika"


# -------------------- relevansi --------------------
def test_text_score_tiers():
    assert relevance.text_score("abc", "abc") == 1.0
    assert relevance.text_score("ab", "abcd") == 0.8        # prefix
    assert relevance.text_score("cd", "abcde") == 0.6       # substring
    assert 0 < relevance.text_score("data sains", "ilmu data terbuka") < 0.5  # token overlap


def test_score_hit_popularity_only_with_match():
    cocok = relevance.score_hit("data", {"title": "Dataset Cuaca", "popularity": 9000})
    tak = relevance.score_hit("xyz", {"title": "Dataset Cuaca", "popularity": 9000})
    assert cocok > 0 and tak == 0.0                         # populer tapi tak cocok → 0
    jelajah = relevance.score_hit("", {"title": "apa saja", "popularity": 5000})
    assert jelajah > 0                                      # query kosong → urut popularitas


# -------------------- mesin --------------------
class FakeSource:
    def __init__(self, kind, rows): self.kind = kind; self.rows = rows
    def search(self, text, filters, limit):
        return self.rows[:limit]


def _engine():
    return SearchEngine([
        FakeSource("user", [{"id": "u1", "title": "Ardika Satria", "url": "/u/ardika", "popularity": 100}]),
        FakeSource("competition", [{"id": "c1", "title": "Prediksi Permintaan UMKM", "url": "/c/umkm", "popularity": 500}]),
        FakeSource("dataset", [{"id": "d1", "title": "Prediksi Cuaca", "url": "/d/cuaca", "popularity": 50}]),
        FakeSource("event", [{"id": "e1", "title": "Workshop Data", "url": "/e/ws", "popularity": 10}]),
    ])


def test_engine_ranks_across_types_and_groups():
    out = _engine().search("prediksi", per_category=5)
    titles = [h["title"] for h in out["results"]]
    # dua hit mengandung "prediksi" (kompetisi & dataset), keduanya muncul
    assert "Prediksi Permintaan UMKM" in titles and "Prediksi Cuaca" in titles
    assert "Workshop Data" not in titles               # tak cocok → tersaring
    assert set(out["grouped"].keys()) <= {"competition", "dataset"}
    # kompetisi (bobot lebih + popularitas) di atas dataset
    assert titles[0] == "Prediksi Permintaan UMKM"


def test_engine_type_filter_restricts_sources():
    out = _engine().search("prediksi type:dataset")
    kinds = {h["kind"] for h in out["results"]}
    assert kinds == {"dataset"}


def test_engine_browse_mode_empty_text():
    out = _engine().search("type:competition")           # tanpa teks → jelajah
    assert [h["kind"] for h in out["results"]] == ["competition"]
    assert out["results"][0]["title"] == "Prediksi Permintaan UMKM"


# -------------------- entitas baru: user, post, org --------------------
def _engine_full():
    return SearchEngine([
        FakeSource("user", [{"id": "u1", "title": "ardikasatria", "subtitle": "Ardika Satria",
                             "url": "/u/ardikasatria", "popularity": 300}]),
        FakeSource("post", [{"id": "p1", "title": "Tips analisis data UMKM", "subtitle": "Feed",
                             "url": "/feed/p1", "popularity": 40}]),
        FakeSource("org", [{"id": "o1", "title": "UMKM Batik Lampung", "subtitle": "Organisasi",
                            "url": "/orgs/umkm-batik-lampung", "popularity": 120}]),
        FakeSource("dataset", [{"id": "d1", "title": "Dataset UMKM", "url": "/d/umkm", "popularity": 60}]),
    ])


def test_engine_covers_users_posts_orgs():
    out = _engine_full().search("umkm")
    kinds = {h["kind"] for h in out["results"]}
    assert {"post", "org", "dataset"} <= kinds              # postingan, organisasi, aset tercakup
    # pencarian username langsung
    u = _engine_full().search("@ardikasatria")
    assert [h["kind"] for h in u["results"]] == ["user"]
    assert u["results"][0]["title"] == "ardikasatria"


def test_engine_filter_organisasi_alias():
    out = _engine_full().search("type:organisasi")          # alias ID → org
    assert [h["kind"] for h in out["results"]] == ["org"]
