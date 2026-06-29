"""
Versi & branch aset (didukung Gitea).
- is_valid_branch_name: validasi sebelum membuat branch (gaya Git refname).
- default_branch       : pilih branch default (configured → main → master → pertama).
- sort_versions        : urutkan tag versi (semver-ish) menurun.
"""
from __future__ import annotations

import re

_INVALID_CHARS = set(" ~^:?*[\\\t")


def is_valid_branch_name(name: str) -> bool:
    if not name or name in (".", ".."):
        return False
    if name.startswith("/") or name.endswith("/") or "//" in name:
        return False
    if name.startswith(".") or name.endswith(".lock") or name.endswith("."):
        return False
    if ".." in name or "@{" in name:
        return False
    if any(c in _INVALID_CHARS for c in name):
        return False
    return bool(re.match(r"^[\w./\-]+$", name))


def default_branch(branches: list[str], configured: str | None = None) -> str | None:
    if configured and configured in branches:
        return configured
    for cand in ("main", "master"):
        if cand in branches:
            return cand
    return branches[0] if branches else None


def _semver_key(tag: str) -> tuple[int, int, int]:
    m = re.match(r"v?(\d+)\.(\d+)\.(\d+)", tag.strip())
    return tuple(int(x) for x in m.groups()) if m else (-1, -1, -1)


def sort_versions(tags: list[str]) -> list[str]:
    return sorted(tags, key=_semver_key, reverse=True)
