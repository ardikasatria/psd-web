"""
DAG pipeline Pabrik Data: validasi + urutan topologis (deteksi siklus).

Node: {id, type, params}. Edge: (from_id, to_id). Kompilasi butuh urutan topologis
& satu sink (node tanpa keluaran) sebagai output akhir.
"""
from __future__ import annotations


class PipelineError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def inputs_map(edges) -> dict:
    m: dict = {}
    for a, b in edges:
        m.setdefault(b, []).append(a)
    return m


def topological_order(nodes, edges) -> list[str]:
    ids = [n["id"] for n in nodes]
    id_set = set(ids)
    if len(ids) != len(id_set):
        raise PipelineError(422, "dup_node", "Ada id node duplikat.")
    for a, b in edges:
        if a not in id_set or b not in id_set:
            raise PipelineError(422, "bad_edge", f"Edge menunjuk node tak ada: {a}->{b}")

    indeg = {i: 0 for i in ids}
    adj: dict = {i: [] for i in ids}
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    queue = [i for i in ids if indeg[i] == 0]      # stabil: urutan definisi
    order: list[str] = []
    while queue:
        n = queue.pop(0)
        order.append(n)
        for m in adj[n]:
            indeg[m] -= 1
            if indeg[m] == 0:
                queue.append(m)
    if len(order) != len(ids):
        raise PipelineError(422, "cycle", "Pipeline memiliki siklus.")
    return order


def find_sink(nodes, edges) -> str:
    has_out = {a for a, _ in edges}
    sinks = [n["id"] for n in nodes if n["id"] not in has_out]
    if len(sinks) != 1:
        raise PipelineError(422, "sink", "Pipeline harus punya tepat satu node keluaran (sink).")
    return sinks[0]
