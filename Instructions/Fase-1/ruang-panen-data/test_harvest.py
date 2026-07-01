"""Uji Ruang Panen Data."""
import pytest

from app.harvest import job, pagination, routing, source
from app.harvest.job import HarvestError


# -------------------- siklus job --------------------
def test_job_lifecycle():
    assert job.apply_action("draft", "queue") == "queued"
    assert job.apply_action("queued", "start") == "running"
    assert job.apply_action("running", "complete") == "completed"
    assert job.apply_action("running", "fail") == "failed"
    assert job.apply_action("failed", "retry") == "queued"
    assert job.apply_action("running", "cancel") == "canceled"
    with pytest.raises(HarvestError) as e:
        job.apply_action("completed", "start")
    assert e.value.status == 409


# -------------------- SSRF & sumber --------------------
def test_ssrf_blocks_internal_targets():
    for bad in ["http://localhost/api", "https://127.0.0.1/x", "https://169.254.169.254/latest/meta-data",
                "https://10.1.2.3/", "https://192.168.0.5/", "http://metadata.google.internal/"]:
        with pytest.raises(HarvestError):
            source.validate_source_url(bad, allow_http=True)


def test_scheme_and_allowlist():
    with pytest.raises(HarvestError) as e:
        source.validate_source_url("http://api.contoh.com/data")   # http tak diizinkan default
    assert e.value.slug == "bad_scheme"
    # allowlist
    ok = source.validate_source_url("https://api.data.go.id/v1/x", allowlist=["data.go.id"])
    assert ok.startswith("https://")
    with pytest.raises(HarvestError) as e2:
        source.validate_source_url("https://evil.com/x", allowlist=["data.go.id"])
    assert e2.value.slug == "not_allowlisted"


def test_validate_auth():
    assert source.validate_auth("bearer") == "bearer"
    with pytest.raises(HarvestError):
        source.validate_auth("oauth1")


# -------------------- paginasi & rate --------------------
def test_pagination_params_and_stop():
    assert pagination.next_request_params(strategy="page", pages_done=2, page_size=50, next_cursor=None) == {"page": 3}
    assert pagination.next_request_params(strategy="offset", pages_done=2, page_size=50, next_cursor=None) == {"offset": 100, "limit": 50}
    assert pagination.next_request_params(strategy="cursor", pages_done=1, page_size=50, next_cursor="abc") == {"cursor": "abc"}
    # berhenti: batch kosong
    assert pagination.should_continue(strategy="page", pages_done=1, records_done=10,
                                      last_batch_size=0, next_cursor=None, max_pages=None, max_records=None) is False
    # berhenti: capai max_records
    assert pagination.should_continue(strategy="page", pages_done=1, records_done=100,
                                      last_batch_size=50, next_cursor=None, max_pages=None, max_records=100) is False
    # cursor habis
    assert pagination.should_continue(strategy="cursor", pages_done=1, records_done=10,
                                      last_batch_size=10, next_cursor=None, max_pages=None, max_records=None) is False
    # lanjut
    assert pagination.should_continue(strategy="page", pages_done=1, records_done=50,
                                      last_batch_size=50, next_cursor=None, max_pages=10, max_records=1000) is True


def test_min_interval():
    assert pagination.min_interval_seconds(60) == 1.0
    assert pagination.min_interval_seconds(0) == 0.0


# -------------------- ekstraksi --------------------
def test_extract_records_path_and_map():
    payload = {"data": {"items": [{"id": 1, "attr": {"name": "A"}}, {"id": 2, "attr": {"name": "B"}}]}}
    rows = routing.extract_records(payload, "data.items",
                                   field_map={"id": "id", "nama": "attr.name"})
    assert rows == [{"id": 1, "nama": "A"}, {"id": 2, "nama": "B"}]
    # tanpa path & map → list mentah
    assert routing.extract_records([{"x": 1}]) == [{"x": 1}]
    assert routing.extract_records({"a": 1}, None) == [{"a": 1}]
    assert routing.extract_records(None, "x") == []


# -------------------- routing ke dataset --------------------
def test_output_target_and_filename():
    t_new = routing.output_target(mode="new", owner="ardika", new_name="Data Cuaca BMKG")
    assert t_new == {"mode": "new", "owner": "ardika", "dataset_slug": "data-cuaca-bmkg"}
    t_ver = routing.output_target(mode="version", owner="ardika", dataset_slug="data-cuaca-bmkg")
    assert t_ver["mode"] == "version"
    assert routing.output_filename("Panen BMKG", "csv", "20260701") == "panen-bmkg-20260701.csv"
    with pytest.raises(ValueError):
        routing.output_target(mode="new", owner="a")        # new_name wajib
