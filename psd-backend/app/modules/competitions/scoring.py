import csv
import io
import math


def _is_num(s: str) -> bool:
    try:
        float(s)
        return True
    except Exception:
        return False


def parse_ground_truth(b: bytes):
    reader = csv.DictReader(io.StringIO(b.decode("utf-8")))
    return [(r["id"].strip(), float(r["target"]), r.get("split", "public").strip()) for r in reader]


def parse_predictions(b: bytes) -> dict:
    rows = list(csv.reader(io.StringIO(b.decode("utf-8"))))
    start = 0 if (rows and _is_num(rows[0][1])) else 1
    return {r[0].strip(): float(r[1]) for r in rows[start:] if len(r) >= 2}


def _rmse(p):
    return math.sqrt(sum((t - q) ** 2 for t, q in p) / len(p)) if p else None


def _rmsle(p):
    return math.sqrt(sum((math.log1p(max(q, 0)) - math.log1p(max(t, 0))) ** 2 for t, q in p) / len(p)) if p else None


def _acc(p):
    return sum(1 for t, q in p if round(q) == round(t)) / len(p) if p else None


METRICS = {"RMSE": (_rmse, False), "RMSLE": (_rmsle, False), "Accuracy": (_acc, True)}


def higher_is_better(metric: str) -> bool:
    return METRICS.get(metric, (None, False))[1]


def score(gt_rows, sub_bytes: bytes, metric: str):
    fn = METRICS.get(metric, (_rmse, False))[0]
    preds = parse_predictions(sub_bytes)
    pub, prv = [], []
    for gid, target, split in gt_rows:
        if gid in preds:
            (pub if split == "public" else prv).append((target, preds[gid]))
    return fn(pub), fn(prv)
