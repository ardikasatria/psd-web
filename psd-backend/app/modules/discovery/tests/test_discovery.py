"""Uji logika penemuan komunitas."""
from datetime import datetime, timedelta, timezone

from app.modules.discovery import affinity, panels, ranking

NOW = datetime(2026, 6, 1, tzinfo=timezone.utc)


def U(id, **kw):
    base = dict(
        id=id,
        username=id,
        type="user",
        avatar_url=None,
        is_official=False,
        reputation=0,
        tier="Pemula",
        affiliation=None,
        org_id=None,
        follower_count=0,
        post_like_total=0,
        created_at=NOW,
        top_badge=None,
    )
    base.update(kw)
    return base


def test_popularity_score_weights_followers_more():
    a = U("a", follower_count=10, post_like_total=0)
    b = U("b", follower_count=0, post_like_total=20)
    assert ranking.popularity_score(a) > ranking.popularity_score(b)


def test_rank_by_excludes_self_and_limits():
    users = [U("me", reputation=999), U("x", reputation=5), U("y", reputation=9)]
    top = ranking.rank_by(users, lambda u: u["reputation"], limit=1, exclude_ids={"me"})
    assert [u["id"] for u in top] == ["y"]


def test_new_members_window():
    users = [
        U("baru", created_at=NOW - timedelta(days=2)),
        U("lama", created_at=NOW - timedelta(days=40)),
    ]
    res = ranking.new_members(users, now=NOW, days=14)
    assert [u["id"] for u in res] == ["baru"]


def test_affiliation_same_institution_excludes_self_and_followed():
    me = U("me", affiliation="Institut Teknologi Sumatera")
    cands = [
        U("teman", affiliation="Institut Teknologi Sumatera", follower_count=5),
        U("diikuti", affiliation="Institut Teknologi Sumatera"),
        U("luar", affiliation="Universitas Lain"),
        U("me", affiliation="Institut Teknologi Sumatera"),
    ]
    out = affinity.suggest_affiliation(me, cands, following_ids={"diikuti"})
    ids = [u["id"] for u in out]
    assert ids == ["teman"]
    assert out[0]["_reason"].startswith("Sesama Institut Teknologi Sumatera")


def test_build_discovery_assembles_panels_with_reasons():
    me = U("me", affiliation="ITERA")
    top = [U("master", reputation=6000, tier="Grandmaster"), U("me", reputation=99999)]
    popular = [U("pop", follower_count=1200)]
    new = [U("nu", created_at=NOW - timedelta(days=1))]
    ach = [U("juara", top_badge="Juara")]
    aff = [U("sejawat", affiliation="ITERA", follower_count=3)]

    out = panels.build_discovery(
        me,
        top_tier_pool=top,
        popular_pool=popular,
        new_pool=new,
        achievements=ach,
        affiliation_pool=aff,
        following_ids=set(),
        now=NOW,
        limit=8,
    )

    assert [p["username"] for p in out["top_tier"]] == ["master"]
    assert out["top_tier"][0]["reason"] == "Tier Grandmaster"
    assert out["popular"][0]["reason"] == "1.2rb pengikut"
    assert out["affiliation"][0]["reason"].startswith("Sesama ITERA")
