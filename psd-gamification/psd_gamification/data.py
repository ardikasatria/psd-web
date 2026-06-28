"""Muat manifest JSON kanonik."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_PKG_DIR = Path(__file__).resolve().parent
_MANIFEST_NAME = "gamification.json"


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    path = _PKG_DIR / _MANIFEST_NAME
    return json.loads(path.read_text(encoding="utf-8"))
