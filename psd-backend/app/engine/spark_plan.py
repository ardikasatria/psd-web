"""Spec → rencana eksekusi Spark (Langkah 54)."""
from __future__ import annotations

from dataclasses import dataclass, field

from .spec import Pipeline, topological_order


@dataclass
class SparkStep:
    op: str
    view: str | None = None
    input_view: str | None = None
    params: dict = field(default_factory=dict)


def _join_sql(node) -> str:
    p = node.params
    how = p.get("how", "inner")
    on = p["on"]
    left, right = node.inputs[0], node.inputs[1]
    return f"SELECT * FROM {left} {how.upper()} JOIN {right} ON {on}"


def build_plan(pipeline: Pipeline) -> list[SparkStep]:
    plan: list[SparkStep] = []
    for node in topological_order(pipeline):
        if node.type == "source":
            plan.append(SparkStep(op="read", view=node.id, params=node.params))
        elif node.type == "sql":
            plan.append(SparkStep(op="sql", view=node.id, params={"sql": node.params["sql"]}))
        elif node.type == "join":
            plan.append(SparkStep(op="sql", view=node.id, params={"sql": _join_sql(node)}))
        elif node.type == "sink":
            if not node.inputs:
                raise ValueError(f"Sink '{node.id}' tak punya input.")
            plan.append(SparkStep(op="write", input_view=node.inputs[0], params=node.params))
        else:
            raise ValueError(f"Tipe node tak didukung: {node.type}")
    return plan
