"""Uji jalur engine Spark (PySpark)."""
import pytest

from app.datafactory import engine, spark_compiler, spark_job
from app.datafactory.dag import PipelineError
from app.datafactory.engine import EngineError


# -------------------- pemilihan engine --------------------
def test_choose_engine():
    assert engine.choose_engine(est_bytes=10_000) == "duckdb"           # kecil
    assert engine.choose_engine(est_bytes=5_000_000_000) == "spark"     # besar
    assert engine.choose_engine(requested="spark", est_bytes=1) == "spark"
    with pytest.raises(EngineError):
        engine.choose_engine(requested="flink")


# -------------------- kompiler PySpark (visual) --------------------
def test_compile_pyspark_visual():
    nodes = [
        {"id": "src", "type": "source", "params": {"relation": "penjualan"}},
        {"id": "flt", "type": "filter", "params": {"predicate": "wilayah = 'Lampung'"}},
        {"id": "agg", "type": "aggregate", "params": {
            "group_by": ["kategori"],
            "aggregations": [{"fn": "sum", "column": "omzet", "as": "total"}]}},
    ]
    code = spark_compiler.compile_pipeline_pyspark(nodes, [("src", "flt"), ("flt", "agg")])
    assert "SparkSession" in code
    assert 'df_src = spark.table("penjualan")' in code
    assert 'df_flt = df_src.filter("wilayah = \'Lampung\'")' in code
    assert 'df_agg = df_flt.groupBy("kategori").agg(F.sum("omzet").alias("total"))' in code
    assert code.rstrip().endswith("result = df_agg")


# -------------------- kompiler PySpark (kode .py mentah) --------------------
def test_compile_pyspark_raw_code_node():
    nodes = [
        {"id": "src", "type": "source", "params": {"relation": "ds"}},
        {"id": "px", "type": "pyspark", "params": {
            "code": "df = inputs[0]\nreturn df.dropDuplicates()"}},
    ]
    code = spark_compiler.compile_pipeline_pyspark(nodes, [("src", "px")])
    assert "def _node_px(inputs):" in code
    assert "    df = inputs[0]" in code                 # kode user diindentasi
    assert "    return df.dropDuplicates()" in code
    assert "df_px = _node_px([df_src])" in code
    assert spark_compiler.has_raw_code(nodes) is True


def test_compile_rejects_bad_identifier():
    nodes = [{"id": "src", "type": "source", "params": {"relation": "ds; rm -rf"}},
             {"id": "s", "type": "select", "params": {"columns": ["a"]}}]
    with pytest.raises(PipelineError):
        spark_compiler.compile_pipeline_pyspark(nodes, [("src", "s")])


# -------------------- isolasi job & gating --------------------
def test_raw_code_tier_gating():
    assert spark_job.raw_code_allowed("menengah") is False    # SQL boleh, kode .py belum
    assert spark_job.raw_code_allowed("lanjut") is True


def test_job_spec_isolation():
    spec = spark_job.build_job_spec(script_key="jobs/pl1.py", user="ardika",
                                    tier="lanjut", has_raw_code=True)
    assert spec["requires_grant"] is True                     # kode mentah → butuh grant Langkah 26
    assert spec["isolation"]["host_mounts"] is False
    assert spec["isolation"]["network_egress"] == "restricted"
    assert spec["output"] == "dataset"
    assert spec["run_as"] == "ardika"

    spec2 = spark_job.build_job_spec(script_key="jobs/pl2.py", user="budi",
                                     tier="menengah", has_raw_code=False)
    assert spec2["requires_grant"] is False                   # pipeline visual → tanpa grant
