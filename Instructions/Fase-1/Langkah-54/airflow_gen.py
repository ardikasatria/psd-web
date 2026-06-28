"""
Generator orkestrasi Airflow (Langkah 54, sub-langkah 2).

Pipeline terjadwal: spec yang SAMA → DAG Airflow. Tiap node jadi task; dependensi
mengikuti `inputs`. Task memanggil eksekutor PSD per node (engine sesuai pemilih).
"""
from __future__ import annotations

from .spec import Pipeline, topological_order


def build_task_graph(pipeline: Pipeline) -> dict:
    """Kembalikan {'tasks': [...], 'edges': [(upstream, downstream), ...]} terurut."""
    order = [n.id for n in topological_order(pipeline)]
    edges = []
    for n in pipeline.nodes:
        for dep in n.inputs:
            edges.append((dep, n.id))
    return {"tasks": order, "edges": edges}


def render_dag(pipeline: Pipeline, *, dag_id: str, schedule: str = "@daily") -> str:
    """Render berkas DAG Airflow (PythonOperator per node)."""
    graph = build_task_graph(pipeline)
    lines = [
        "from airflow import DAG",
        "from airflow.operators.python import PythonOperator",
        "from datetime import datetime",
        "from app.engine.airflow_runtime import run_node  # eksekutor PSD per node",
        "",
        f"with DAG(dag_id={dag_id!r}, schedule={schedule!r},",
        "         start_date=datetime(2024, 1, 1), catchup=False) as dag:",
    ]
    for tid in graph["tasks"]:
        lines.append(
            f"    t_{tid} = PythonOperator(task_id={tid!r}, "
            f"python_callable=run_node, op_kwargs={{'pipeline_id': {pipeline.id!r}, 'node_id': {tid!r}}})"
        )
    lines.append("")
    for up, down in graph["edges"]:
        lines.append(f"    t_{up} >> t_{down}")
    return "\n".join(lines) + "\n"
