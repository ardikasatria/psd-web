"""
Spec pipeline engine-agnostik (Langkah 54).

Kanvas & spec Langkah 44–45 tidak berubah; adaptor (adaptor.py) menerjemahkan
spec PSD → Pipeline/Node di sini untuk Spark/Airflow.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Node:
    id: str
    type: str
    params: dict = field(default_factory=dict)
    inputs: list[str] = field(default_factory=list)


@dataclass
class Pipeline:
    id: str
    nodes: list[Node]
    engine: str = "auto"

    def node_map(self) -> dict[str, Node]:
        return {n.id: n for n in self.nodes}


def topological_order(pipeline: Pipeline) -> list[Node]:
    nodes = pipeline.node_map()
    indeg = {nid: 0 for nid in nodes}
    for n in pipeline.nodes:
        for dep in n.inputs:
            if dep not in nodes:
                raise ValueError(f"Node '{n.id}' merujuk input tak dikenal '{dep}'.")
            indeg[n.id] += 1
    queue = [nid for nid, d in indeg.items() if d == 0]
    order: list[Node] = []
    while queue:
        nid = queue.pop(0)
        order.append(nodes[nid])
        for m in pipeline.nodes:
            if nid in m.inputs:
                indeg[m.id] -= 1
                if indeg[m.id] == 0:
                    queue.append(m.id)
    if len(order) != len(pipeline.nodes):
        raise ValueError("Pipeline memiliki siklus (DAG tidak valid).")
    return order
