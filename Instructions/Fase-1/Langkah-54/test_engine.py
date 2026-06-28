"""
Uji jalur eksekusi (Langkah 54) — murni Python, tanpa Spark/Airflow hidup.
"""
import pytest

from app.engine import airflow_gen, dispatch, selector, spark_plan
from app.engine.spec import Node, Pipeline, topological_order


def sample_pipeline(engine="auto"):
    # source a, source b → join j → sql agg → sink out
    return Pipeline(id="p1", engine=engine, nodes=[
        Node(id="a", type="source", params={"uri": "psd://x/a/a.parquet"}),
        Node(id="b", type="source", params={"uri": "psd://x/b/b.parquet"}),
        Node(id="j", type="join", params={"on": "a.k = b.k", "how": "inner"},
             inputs=["a", "b"]),
        Node(id="agg", type="sql", params={"sql": "SELECT k, count(*) c FROM j GROUP BY k"},
             inputs=["j"]),
        Node(id="out", type="sink", params={"target": "gold.hasil", "format": "parquet"},
             inputs=["agg"]),
    ])


# -------------------- topologi --------------------
def test_topological_order_valid():
    order = [n.id for n in topological_order(sample_pipeline())]
    assert order.index("a") < order.index("j")
    assert order.index("j") < order.index("agg")
    assert order.index("agg") < order.index("out")


def test_cycle_detected():
    p = Pipeline(id="c", nodes=[
        Node(id="x", type="sql", params={"sql": "1"}, inputs=["y"]),
        Node(id="y", type="sql", params={"sql": "1"}, inputs=["x"]),
    ])
    with pytest.raises(ValueError):
        topological_order(p)


def test_unknown_input():
    p = Pipeline(id="u", nodes=[Node(id="x", type="sink", inputs=["tiada"])])
    with pytest.raises(ValueError):
        topological_order(p)


# -------------------- pemilih engine --------------------
def test_selector_explicit_wins():
    assert selector.choose_engine(sample_pipeline("spark")) == "spark"
    assert selector.choose_engine(sample_pipeline("duckdb"), est_bytes=10**12) == "duckdb"


def test_selector_auto_threshold():
    assert selector.choose_engine(sample_pipeline("auto"), est_bytes=1) == "duckdb"
    big = 6 * 1024 ** 3
    assert selector.choose_engine(sample_pipeline("auto"), est_bytes=big) == "spark"
    assert selector.choose_engine(sample_pipeline("auto")) == "duckdb"   # default


# -------------------- rencana Spark --------------------
def test_build_plan_order_and_ops():
    plan = spark_plan.build_plan(sample_pipeline())
    ops = [(s.op, s.view or s.input_view) for s in plan]
    assert ops[0] == ("read", "a")
    assert ops[1] == ("read", "b")
    assert ("sql", "j") in ops
    assert ("sql", "agg") in ops
    assert ops[-1] == ("write", "agg")
    # join diterjemahkan ke SQL
    j = next(s for s in plan if s.view == "j")
    assert "JOIN" in j.params["sql"]


# -------------------- eksekutor (fake Spark) --------------------
class FakeDF:
    def __init__(self, log, name): self.log, self.name = log, name
    def createOrReplaceTempView(self, v): self.log.append(("view", v))


class FakeSession:
    def __init__(self): self.log = []
    def sql(self, q): self.log.append(("sql", q)); return FakeDF(self.log, "sql")
    def table(self, t): self.log.append(("table", t)); return FakeDF(self.log, t)


def test_spark_executor_applies_plan():
    from app.engine.spark_executor import SparkExecutor
    session = FakeSession()
    reads, writes = [], []

    def read_fn(s, params):
        reads.append(params["uri"]); return FakeDF(s.log, "read")

    def write_fn(df, params):
        writes.append(params["target"])

    plan = spark_plan.build_plan(sample_pipeline())
    out = SparkExecutor(session, read_fn=read_fn, write_fn=write_fn).run(plan)
    assert reads == ["psd://x/a/a.parquet", "psd://x/b/b.parquet"]
    assert writes == ["gold.hasil"]
    assert out == ["gold.hasil"]
    # view terdaftar untuk a, b, j, agg
    views = [v for (t, v) in session.log if t == "view"]
    assert set(views) == {"a", "b", "j", "agg"}


# -------------------- Airflow --------------------
def test_airflow_graph_deps():
    g = airflow_gen.build_task_graph(sample_pipeline())
    assert set(g["tasks"]) == {"a", "b", "j", "agg", "out"}
    assert ("a", "j") in g["edges"]
    assert ("agg", "out") in g["edges"]


def test_render_dag_contains_tasks_and_deps():
    code = airflow_gen.render_dag(sample_pipeline(), dag_id="psd_p1", schedule="@daily")
    assert "PythonOperator" in code
    assert "t_agg >> t_out" in code
    assert "psd_p1" in code


# -------------------- dispatch --------------------
def test_dispatch_routes_to_queue():
    assert dispatch.plan_execution(sample_pipeline("spark"))["queue"] == "spark"
    assert dispatch.plan_execution(sample_pipeline("duckdb"))["queue"] == "pabrik_data"
    big = dispatch.plan_execution(sample_pipeline("auto"), est_bytes=10 * 1024 ** 3)
    assert big["engine"] == "spark" and big["queue"] == "spark"
