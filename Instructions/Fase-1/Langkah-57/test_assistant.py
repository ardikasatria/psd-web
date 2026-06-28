"""
Uji AI Asisten & Rekomendasi (Langkah 57) — murni Python + FastAPI TestClient.
"""
import pytest

from app.assistant import feed as feed_mod
from app.assistant import recommend
from app.assistant.affinity import build_affinity
from app.assistant.assistant import AIAssistant, build_messages
from app.assistant.quota import InMemoryWindowStore, QuotaExceeded


CANDIDATES = [
    {"id": "d1", "categories": ["nlp"], "tags": ["teks", "indo"]},
    {"id": "d2", "categories": ["cv"], "tags": ["citra"]},
    {"id": "d3", "categories": ["nlp"], "tags": ["teks"]},
    {"id": "d4", "categories": ["tabular"], "tags": ["umkm"]},
]
POP = {"d1": 10, "d2": 100, "d3": 5, "d4": 50}


# -------------------- afinitas --------------------
def test_build_affinity_normalizes():
    p = build_affinity({"categories": {"nlp": 3, "cv": 1}, "tags": {"teks": 4},
                        "event_count": 8})
    assert abs(sum(p.categories.values()) - 1.0) < 1e-9
    assert p.categories["nlp"] == 0.75
    assert p.total == 8


# -------------------- rekomendasi --------------------
def test_cold_start_uses_popularity():
    p = build_affinity({"categories": {}, "tags": {}, "event_count": 0})
    out = recommend.recommend(p, CANDIDATES, popularity=POP, k=4)
    assert out["strategy"] == "popularity"
    assert [c["id"] for c in out["items"]] == ["d2", "d4", "d1", "d3"]


def test_affinity_ranks_relevant_first():
    p = build_affinity({"categories": {"nlp": 10}, "tags": {"teks": 10},
                        "event_count": 20})
    out = recommend.recommend(p, CANDIDATES, popularity=POP, k=4)
    assert out["strategy"] == "affinity"
    # item nlp/teks (d1,d3) harus di atas cv/tabular
    top2 = {c["id"] for c in out["items"][:2]}
    assert top2 == {"d1", "d3"}


def test_exclude_and_category_cap():
    p = build_affinity({"categories": {"nlp": 10}, "tags": {"teks": 10},
                        "event_count": 20})
    out = recommend.recommend(p, CANDIDATES, popularity=POP, k=10,
                              exclude_ids=["d1"], per_category_cap=1)
    ids = [c["id"] for c in out["items"]]
    assert "d1" not in ids                      # dikecualikan
    # cap 1 per kategori → hanya satu item 'nlp'
    nlp_count = sum(1 for c in out["items"] if "nlp" in c["categories"])
    assert nlp_count == 1


# -------------------- kuota AI --------------------
def test_ai_quota_gating():
    store = InMemoryWindowStore()
    llm = lambda msgs: "halo"
    a = AIAssistant(llm, store)
    for _ in range(20):                          # pemula = 20
        a.answer(user_id="u", tier="pemula", question="?")
    with pytest.raises(QuotaExceeded):
        a.answer(user_id="u", tier="pemula", question="?")


def test_build_messages_injects_context():
    msgs = build_messages("Bagaimana publikasi dataset?", {"fitur": "dataset, kompetisi"})
    assert msgs[0]["role"] == "system"
    assert any("Konteks" in m["content"] for m in msgs)
    assert msgs[-1] == {"role": "user", "content": "Bagaimana publikasi dataset?"}


def test_assistant_calls_llm_with_messages():
    seen = {}
    store = InMemoryWindowStore()

    def llm(messages):
        seen["messages"] = messages
        return "Gunakan menu Dataset → Publikasikan."

    a = AIAssistant(llm, store)
    out = a.answer(user_id="u", tier="lanjut", question="cara publish?",
                   context={"fitur": "dataset"})
    assert out["reply"].startswith("Gunakan")
    assert out["quota"]["remaining"] == 499
    assert seen["messages"][-1]["content"] == "cara publish?"


# -------------------- langkah berikutnya & feed --------------------
def test_next_steps_rules():
    steps = feed_mod.next_steps({"completed_courses": 2, "joined_competitions": 0,
                                 "has_published_dataset": False,
                                 "points": 100, "next_tier_points": 80})
    actions = {s["action"] for s in steps}
    assert actions == {"join_competition", "publish_dataset", "tier_up"}


def test_build_feed_orders_steps_first():
    feed = feed_mod.build_feed({"dataset": [{"id": "d1"}], "course": []},
                               steps=[{"action": "publish_dataset", "text": "..."}])
    assert feed[0]["type"] == "next_steps"
    kinds = [s.get("kind") for s in feed if s["type"] == "recommendation"]
    assert kinds == ["dataset"]                 # 'course' kosong → tak muncul


# -------------------- endpoint --------------------
@pytest.mark.asyncio
async def test_ask_endpoint_quota(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.assistant import endpoint as ep
    from app.assistant import seams

    monkeypatch.setattr(seams, "user_id", lambda u: "u1")
    monkeypatch.setattr(seams, "user_tier", lambda u: "pemula")

    store = InMemoryWindowStore()
    assistant = AIAssistant(lambda msgs: "jawaban", store)

    app = FastAPI()
    app.include_router(ep.router)
    app.dependency_overrides[ep.get_current_user] = lambda: {"id": 1}
    app.dependency_overrides[ep.get_assistant] = lambda: assistant

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/assistant/ask", json={"question": "halo"})
        assert r.status_code == 200
        assert r.json()["reply"] == "jawaban"
        for _ in range(19):
            await c.post("/api/assistant/ask", json={"question": "x"})
        r = await c.post("/api/assistant/ask", json={"question": "x"})
        assert r.status_code == 429


@pytest.mark.asyncio
async def test_feed_endpoint_cold_start(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.assistant import endpoint as ep
    from app.assistant import seams

    monkeypatch.setattr(seams, "user_id", lambda u: "u1")
    monkeypatch.setattr(seams, "activity_summary",
                        lambda uid: {"categories": {}, "tags": {}, "event_count": 0})
    monkeypatch.setattr(seams, "candidate_items", lambda kind: CANDIDATES)
    monkeypatch.setattr(seams, "popularity", lambda kind: POP)
    monkeypatch.setattr(seams, "user_state",
                        lambda uid: {"has_published_dataset": False})

    app = FastAPI()
    app.include_router(ep.router)
    app.dependency_overrides[ep.get_current_user] = lambda: {"id": 1}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/feed?kinds=dataset")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["strategy"] == "popularity"      # cold start
        assert body["feed"][0]["type"] == "next_steps"
