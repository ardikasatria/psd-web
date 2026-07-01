"""Uji Pabrik Data (kompilasi DAG → SQL DuckDB)."""
import re

import pytest

from app.datafactory import compiler, dag, sandbox, sql_guard
from app.datafactory.dag import PipelineError


# -------------------- DAG --------------------
def test_topological_order_and_sink():
    nodes = [{"id": "src", "type": "source"}, {"id": "flt", "type": "filter"},
             {"id": "agg", "type": "aggregate"}]
    edges = [("src", "flt"), ("flt", "agg")]
    assert dag.topological_order(nodes, edges) == ["src", "flt", "agg"]
    assert dag.find_sink(nodes, edges) == "agg"


def test_cycle_detected():
    nodes = [{"id": "a", "type": "source"}, {"id": "b", "type": "filter"}]
    with pytest.raises(PipelineError) as e:
        dag.topological_order(nodes, [("a", "b"), ("b", "a")])
    assert e.value.slug == "cycle"


def test_multiple_sinks_rejected():
    nodes = [{"id": "a", "type": "source"}, {"id": "b", "type": "select"}, {"id": "c", "type": "select"}]
    with pytest.raises(PipelineError):
        dag.find_sink(nodes, [("a", "b"), ("a", "c")])   # dua sink


# -------------------- guard SQL --------------------
def test_sql_guard_allows_select():
    assert sql_guard.validate_select_sql("SELECT a, b FROM \"src\" WHERE a > 0;").startswith("SELECT")
    assert sql_guard.validate_select_sql("WITH t AS (SELECT 1) SELECT * FROM t").startswith("WITH")


def test_sql_guard_blocks_dangerous():
    for bad in [
        "SELECT * FROM read_parquet('/etc/passwd')",
        "ATTACH 'x.db' AS y",
        "COPY t TO 'out.csv'",
        "INSTALL httpfs",
        "SELECT 1; DROP TABLE t",
        "SELECT * FROM information_schema.tables",
        "SELECT 1 -- komentar",
        "PRAGMA database_list",
        "UPDATE t SET a=1",
    ]:
        with pytest.raises(PipelineError):
            sql_guard.validate_select_sql(bad)


# -------------------- kompilasi --------------------
def test_compile_linear_pipeline():
    nodes = [
        {"id": "src", "type": "source", "params": {"relation": "dataset_penjualan"}},
        {"id": "flt", "type": "filter", "params": {"predicate": "wilayah = 'Lampung'"}},
        {"id": "agg", "type": "aggregate", "params": {
            "group_by": ["kategori"],
            "aggregations": [{"fn": "sum", "column": "omzet", "as": "total_omzet"}]}},
    ]
    edges = [("src", "flt"), ("flt", "agg")]
    sql = compiler.compile_pipeline(nodes, edges)
    assert sql.startswith("WITH")
    assert '"src" AS (' in sql and '"flt" AS (' in sql and '"agg" AS (' in sql
    assert 'FROM "dataset_penjualan"' in sql
    assert "GROUP BY \"kategori\"" in sql
    assert sql.rstrip().endswith('SELECT * FROM "agg"')     # sink


def test_compile_raw_sql_node():
    nodes = [
        {"id": "src", "type": "source", "params": {"relation": "ds"}},
        {"id": "q", "type": "sql", "params": {"sql": 'SELECT count(*) AS n FROM "src"'}},
    ]
    sql = compiler.compile_pipeline(nodes, [("src", "q")])
    assert 'SELECT count(*) AS n FROM "src"' in sql
    assert sql.rstrip().endswith('SELECT * FROM "q"')


def test_compile_rejects_bad_identifier_and_agg():
    nodes = [{"id": "src", "type": "source", "params": {"relation": "ds; DROP TABLE x"}},
             {"id": "s", "type": "select", "params": {"columns": ["a"]}}]
    with pytest.raises(PipelineError):
        compiler.compile_pipeline(nodes, [("src", "s")])


# -------------------- sandbox & tier --------------------
def test_hardening_order():
    settings = sandbox.duckdb_hardening()
    assert settings[-1] == "SET lock_configuration=true"     # kunci terakhir
    assert any("enable_external_access=false" in s for s in settings)


def test_raw_sql_tier_gating():
    assert sandbox.raw_sql_allowed("pemula") is False
    assert sandbox.raw_sql_allowed("menengah") is True
    assert sandbox.raw_sql_allowed("lanjut") is True


def test_medallion_layer():
    assert sandbox.target_layer("source") == "bronze"
    assert sandbox.target_layer("sink") == "gold"
