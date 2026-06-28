"""
Eksekutor Spark (Langkah 54, sub-langkah 1).

Menerapkan rencana (spark_plan.build_plan) ke sebuah SparkSession.
IO Spark (baca sumber / tulis sink) sengaja di balik fungsi yang dapat diinject
(`read_fn`, `write_fn`) agar:
  - mudah diuji tanpa Spark hidup,
  - URI `psd://` & format ditangani satu tempat.

Implementasi nyata read_fn/write_fn memakai session.read.format(...).load(...) /
df.write.format(...).save(...). Lihat brief.
"""
from __future__ import annotations

from .spark_plan import SparkStep


class SparkExecutor:
    def __init__(self, session, *, read_fn, write_fn):
        self.session = session
        self.read_fn = read_fn          # (session, params) -> DataFrame
        self.write_fn = write_fn        # (df, params) -> None

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
