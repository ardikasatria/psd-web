import numpy as np
import pandas as pd
from faker import Faker

from app.modules.synthesis.spec import DatasetSpec


def _col(c, n, rng, fake):
    p, t = c.params, c.dtype
    if t == "id":
        return np.arange(1, n + 1)
    if t == "int":
        return rng.integers(p.get("min", 0), p.get("max", 100) + 1, n)
    if t == "float":
        d = p.get("dist", "normal")
        if d == "uniform":
            return rng.uniform(p.get("min", 0), p.get("max", 1), n)
        if d == "lognormal":
            return rng.lognormal(p.get("mean", 0), p.get("sigma", 1), n)
        return rng.normal(p.get("mean", 0), p.get("std", 1), n)
    if t == "category":
        cats = p.get("categories", ["A", "B"])
        w = p.get("weights")
        w = np.array(w) / np.sum(w) if w else None
        return rng.choice(cats, n, p=w)
    if t == "bool":
        return rng.random(n) < p.get("p", 0.5)
    if t == "datetime":
        start = np.datetime64(p.get("start", "2023-01-01"))
        end = np.datetime64(p.get("end", "2024-12-31"))
        days = (end - start).astype("timedelta64[D]").astype(int)
        return start + rng.integers(0, max(days, 1), n).astype("timedelta64[D]")
    if t == "name":
        return [fake.name() for _ in range(n)]
    if t == "address":
        return [fake.address().replace("\n", ", ") for _ in range(n)]
    if t == "city":
        return [fake.city() for _ in range(n)]
    if t == "company":
        return [fake.company() for _ in range(n)]
    if t == "phone":
        return [fake.phone_number() for _ in range(n)]
    if t == "text":
        return rng.choice(p.get("samples", ["lorem"]), n)
    return [None] * n


def generate(spec: DatasetSpec, n: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    fake = Faker("id_ID")
    Faker.seed(seed)
    df = pd.DataFrame()
    for c in [c for c in spec.columns if c.dtype != "formula"]:
        df[c.name] = _col(c, n, rng, fake)
    for c in [c for c in spec.columns if c.dtype == "formula"]:
        df[c.name] = df.eval(c.params["expr"])
    return df
