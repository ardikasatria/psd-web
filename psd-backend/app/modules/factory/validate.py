from collections import deque

NODE_TYPES = {"source", "transform", "sink"}
TRANSFORM_OPS = {"select", "filter", "join", "aggregate", "cast", "derive", "dedupe"}
LAYERS = {None, "bronze", "silver", "gold"}


def validate_spec(spec: dict, max_nodes: int) -> list[str]:
    errors: list[str] = []
    nodes = spec.get("nodes", []) or []
    edges = spec.get("edges", []) or []
    ids = [n.get("id") for n in nodes]

    if len(nodes) > max_nodes:
        errors.append(f"Jumlah node ({len(nodes)}) melebihi batas tier ({max_nodes})")
    if len(ids) != len(set(ids)):
        errors.append("Terdapat ID node duplikat")
    idset = set(ids)

    for n in nodes:
        nid = n.get("id")
        t = n.get("type")
        if t not in NODE_TYPES:
            errors.append(f"Tipe node tidak dikenal pada '{nid}'")
        if t == "transform" and n.get("op") not in TRANSFORM_OPS:
            errors.append(f"Operasi transform tidak dikenal pada '{nid}'")
        if n.get("layer") not in LAYERS:
            errors.append(f"Lapisan tidak valid pada '{nid}'")
        if t == "source" and not (n.get("params") or {}).get("source_id"):
            errors.append(f"Node source tanpa source_id pada '{nid}'")

    indeg = {i: 0 for i in ids}
    adj = {i: [] for i in ids}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s not in idset or t not in idset:
            errors.append("Edge menunjuk node yang tidak ada")
            continue
        adj[s].append(t)
        indeg[t] += 1

    for n in nodes:
        nid, t = n.get("id"), n.get("type")
        if t == "source" and indeg.get(nid, 0) > 0:
            errors.append(f"Node source tidak boleh memiliki input: '{nid}'")
        if t != "source" and len(nodes) > 1 and indeg.get(nid, 0) == 0:
            errors.append(f"Node tanpa input: '{nid}'")
        if n.get("op") == "join" and indeg.get(nid, 0) < 2:
            errors.append(f"Operasi join membutuhkan 2 input: '{nid}'")

    ind = dict(indeg)
    dq = deque([i for i in ids if ind[i] == 0])
    seen = 0
    while dq:
        x = dq.popleft()
        seen += 1
        for y in adj[x]:
            ind[y] -= 1
            if ind[y] == 0:
                dq.append(y)
    if seen != len(ids):
        errors.append("Graf memiliki siklus — pipeline harus DAG (asiklik)")
    return errors
