"""Eksekutor Spark (Langkah 54)."""
from __future__ import annotations

from .spark_plan import SparkStep


class SparkExecutor:
    def __init__(self, session, *, read_fn, write_fn):
        self.session = session
        self.read_fn = read_fn
        self.write_fn = write_fn

    def run(self, plan: list[SparkStep]) -> list[str]:
        outputs: list[str] = []
        for step in plan:
            if step.op == "read":
                df = self.read_fn(self.session, step.params)
                df.createOrReplaceTempView(step.view)
            elif step.op == "sql":
                df = self.session.sql(step.params["sql"])
                df.createOrReplaceTempView(step.view)
            elif step.op == "write":
                df = self.session.table(step.input_view)
                self.write_fn(df, step.params)
                outputs.append(step.params.get("target", step.input_view))
            else:
                raise ValueError(f"Operasi tak dikenal: {step.op}")
        return outputs
