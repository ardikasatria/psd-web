"""
Pembatasan DUA OPSI engine Pabrik Data lewat gamifikasi.

Opsi: 'duckdb' (SQL, ringan) & 'spark' (PySpark, besar). Kapabilitas & kuota naik
mengikuti tier (pemula < menengah < lanjut). Poin aktivitas menaikkan tier → membuka
lebih banyak (loop gamifikasi).
"""
from __future__ import annotations


class LimitError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


# tier → engine → kapabilitas
ENGINE_MATRIX: dict[str, dict[str, dict]] = {
    "pemula": {
        "duckdb": {"allowed": True, "max_runs_per_day": 5, "max_bytes": 200_000_000,
                   "raw_sql": False, "raw_code": False, "max_executors": 0},
        "spark":  {"allowed": False},
    },
    "menengah": {
        "duckdb": {"allowed": True, "max_runs_per_day": 30, "max_bytes": 1_000_000_000,
                   "raw_sql": True, "raw_code": False, "max_executors": 0},
        "spark":  {"allowed": True, "max_runs_per_day": 10, "max_bytes": 20_000_000_000,
                   "raw_sql": True, "raw_code": False, "max_executors": 3},
    },
    "lanjut": {
        "duckdb": {"allowed": True, "max_runs_per_day": 100, "max_bytes": 5_000_000_000,
                   "raw_sql": True, "raw_code": False, "max_executors": 0},
        "spark":  {"allowed": True, "max_runs_per_day": 50, "max_bytes": 200_000_000_000,
                   "raw_sql": True, "raw_code": True, "max_executors": 8},
    },
}
DEFAULT_TIER = "pemula"


def capabilities(tier: str, engine: str) -> dict:
    return ENGINE_MATRIX.get(tier, ENGINE_MATRIX[DEFAULT_TIER]).get(engine, {"allowed": False})


def check_engine_allowed(tier: str, engine: str) -> None:
    if not capabilities(tier, engine).get("allowed"):
        raise LimitError(403, "engine_locked",
                         f"Engine '{engine}' belum terbuka untuk tier '{tier}'.")


def check_run_quota(tier: str, engine: str, runs_today: int) -> None:
    cap = capabilities(tier, engine)
    limit = cap.get("max_runs_per_day", 0)
    if runs_today >= limit:
        raise LimitError(429, "run_quota", f"Batas run harian tercapai ({limit}).")


def check_data_size(tier: str, engine: str, est_bytes: int) -> None:
    cap = capabilities(tier, engine)
    if est_bytes > cap.get("max_bytes", 0):
        raise LimitError(413, "data_too_large",
                         f"Ukuran data melebihi batas tier untuk engine ini.")


def can_use_raw_sql(tier: str, engine: str) -> bool:
    return bool(capabilities(tier, engine).get("raw_sql"))


def can_use_raw_code(tier: str, engine: str) -> bool:
    return bool(capabilities(tier, engine).get("raw_code"))
