"""Bangun pohon berkas (untuk tab Files gaya GitHub) dari daftar path datar."""
from __future__ import annotations


def build_tree(paths: list[str]) -> list[dict]:
    root: dict = {}
    for p in paths:
        parts = [x for x in p.split("/") if x]
        cur = root
        for i, part in enumerate(parts):
            last = i == len(parts) - 1
            entry = cur.setdefault(part, {"name": part,
                                          "type": "file" if last else "dir",
                                          "children": {}})
            if not last:
                entry["type"] = "dir"
                cur = entry["children"]

    def to_list(d: dict) -> list[dict]:
        items = []
        for v in d.values():
            node = {"name": v["name"], "type": v["type"]}
            if v["type"] == "dir":
                node["children"] = to_list(v["children"])
            items.append(node)
        # folder dulu, lalu berkas; masing-masing alfabet
        items.sort(key=lambda n: (n["type"] != "dir", n["name"].lower()))
        return items

    return to_list(root)
