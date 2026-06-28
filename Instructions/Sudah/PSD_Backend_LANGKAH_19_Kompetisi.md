# Langkah 19 — Kompetisi: Submission ke S3, Batas Harian, Leaderboard Publik/Privat

> **Tujuan:** Submission diunggah ke storage privat, dinilai terhadap *ground truth* (skor publik & privat), dengan batas harian; leaderboard privat dibuka setelah kompetisi berakhir. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 6 (kompetisi), 13 (storage S3).
>
> **Catatan:** skoring di sini membandingkan **berkas prediksi** (CSV), bukan menjalankan kode peserta — aman, tanpa sandbox. Skoring kode tak tepercaya tetap di luar lingkup Fase 0.

## 19.1 Field baru & bucket privat

`Competition`:

```python
daily_submission_limit: Mapped[int] = mapped_column(Integer, default=5)
ground_truth_key: Mapped[str | None] = mapped_column(String, nullable=True)
```

`Submission`:

```python
private_score: Mapped[float | None] = mapped_column(Float, nullable=True)
file_key: Mapped[str | None] = mapped_column(String, nullable=True)
```

Config (`app/core/config.py`):

```python
S3_SUBMISSIONS_BUCKET: str = "psd-submissions"   # PRIVAT (tanpa public-read)
```

Compose `minio-init` (tambah, **tanpa** `anonymous set download`):

```
mc mb -p local/psd-submissions || true
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "competition scoring fields"
docker compose exec backend alembic upgrade head
```

## 19.2 Helper storage privat — `app/core/storage.py`

```python
def upload_private(key: str, data: bytes, content_type: str) -> str:
    _s3.put_object(Bucket=settings.S3_SUBMISSIONS_BUCKET, Key=key, Body=data, ContentType=content_type)
    return key

def get_object_bytes(key: str) -> bytes:
    return _s3.get_object(Bucket=settings.S3_SUBMISSIONS_BUCKET, Key=key)["Body"].read()

def presigned_get(key: str, expires: int = 3600) -> str:
    return _s3.generate_presigned_url("get_object",
        Params={"Bucket": settings.S3_SUBMISSIONS_BUCKET, "Key": key}, ExpiresIn=expires)
```

## 19.3 Skoring — `app/modules/competitions/scoring.py`

```python
import csv, io, math

def _is_num(s):
    try: float(s); return True
    except Exception: return False

def parse_ground_truth(b: bytes):
    reader = csv.DictReader(io.StringIO(b.decode("utf-8")))
    return [(r["id"].strip(), float(r["target"]), r.get("split", "public").strip()) for r in reader]

def parse_predictions(b: bytes) -> dict:
    rows = list(csv.reader(io.StringIO(b.decode("utf-8"))))
    start = 0 if (rows and _is_num(rows[0][1])) else 1   # lewati header bila ada
    return {r[0].strip(): float(r[1]) for r in rows[start:] if len(r) >= 2}

def _rmse(p):  return math.sqrt(sum((t - q) ** 2 for t, q in p) / len(p)) if p else None
def _rmsle(p): return math.sqrt(sum((math.log1p(max(q, 0)) - math.log1p(max(t, 0))) ** 2 for t, q in p) / len(p)) if p else None
def _acc(p):   return sum(1 for t, q in p if round(q) == round(t)) / len(p) if p else None

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
```

## 19.4 Submission — ganti endpoint POST (Langkah 6)

```python
import uuid
from datetime import datetime, timezone
from fastapi import UploadFile, File
from app.core.storage import upload_private, get_object_bytes
from app.modules.competitions.scoring import parse_ground_truth, score

@router.post("/competitions/{slug}/submissions", status_code=201)
async def submit(slug: str, file: UploadFile = File(...), user: User = Depends(get_current_user),
                 db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    if c.status != "active":
        raise ApiError(400, "closed", "Kompetisi tidak menerima submission saat ini")

    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used = (await db.execute(select(func.count()).select_from(Submission).where(
        Submission.competition_id == c.id, Submission.user_id == user.id,
        Submission.created_at >= start))).scalar_one()
    if used >= c.daily_submission_limit:
        raise ApiError(429, "limit_reached", f"Batas {c.daily_submission_limit} submission/hari tercapai")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maksimal 10 MB")
    key = f"submissions/{c.id}/{user.id}/{uuid.uuid4().hex}.csv"
    upload_private(key, data, "text/csv")

    s = Submission(competition_id=c.id, user_id=user.id, file_key=key,
                   filename=file.filename or "submission.csv", status="queued")
    db.add(s); await db.commit(); await db.refresh(s)

    if c.ground_truth_key:
        try:
            gt = parse_ground_truth(get_object_bytes(c.ground_truth_key))
            s.public_score, s.private_score = score(gt, data, c.metric)
            s.status = "scored"
        except Exception:
            s.status = "failed"
        await db.commit(); await db.refresh(s)

    return {"id": s.id, "created_at": s.created_at, "status": s.status,
            "public_score": s.public_score, "filename": s.filename,
            "remaining_today": max(0, c.daily_submission_limit - used - 1)}
```

> `GET /competitions/{slug}/submissions` (Langkah 6) tetap; tampilkan `public_score` saja (jangan bocorkan `private_score` sebelum kompetisi berakhir).

## 19.5 Leaderboard publik/privat — ganti endpoint (Langkah 6)

```python
from app.core.deps import get_current_user_optional
from app.modules.competitions.scoring import higher_is_better

@router.get("/competitions/{slug}/leaderboard")
async def leaderboard(slug: str, board: str = "public",
                      viewer: User | None = Depends(get_current_user_optional),
                      p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    c = await _get(db, slug)
    if board == "private" and c.status != "past" and not (viewer and viewer.role == "admin"):
        raise ApiError(403, "leaderboard_locked", "Leaderboard privat dibuka setelah kompetisi berakhir")

    rows = (await db.execute(select(Submission, User).join(User, Submission.user_id == User.id)
            .where(Submission.competition_id == c.id, Submission.status == "scored"))).all()
    hib = higher_is_better(c.metric)
    best: dict = {}
    for s, u in rows:
        sc = s.private_score if board == "private" else s.public_score
        if sc is None:
            continue
        cur = best.get(u.id)
        if cur is None or (sc > cur[0]) == hib:
            best[u.id] = (sc, u, s.created_at)

    ranked = sorted(best.values(), key=lambda x: x[0], reverse=hib)
    total = len(ranked)
    page = ranked[p.offset:p.offset + p.page_size]
    items = [{"rank": p.offset + i + 1, "score": sc, "submitted_at": ts,
              "participant": {"username": u.username, "type": "user", "avatar_url": u.avatar_url}}
             for i, (sc, u, ts) in enumerate(page)]
    return paginated(items, total, p)
```

> Leaderboard kini **dihitung dari submission** (skor terbaik per peserta). Tabel `LeaderboardRow` (Langkah 6) tidak lagi dipakai — boleh dibiarkan atau dihapus. Pada seed, buat beberapa submission ber-`status="scored"` (dengan `public_score`/`private_score`) agar leaderboard demo terisi.

## 19.6 Admin: unggah ground truth & atur batas

Tambah ke router admin (Langkah 12):

```python
@router.post("/admin/competitions/{slug}/ground-truth")
async def upload_ground_truth(slug: str, file: UploadFile = File(...), db=Depends(get_db)):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    key = f"ground-truth/{c.id}.csv"
    upload_private(key, await file.read(), "text/csv")
    c.ground_truth_key = key
    await db.commit()
    return {"ok": True}
```

`daily_submission_limit` diatur lewat `PATCH /admin/competitions/{slug}` (sudah ada). Format ground truth CSV: kolom `id,target,split` (`split` = `public`|`private`).

## 19.7 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `CompetitionDetail` **+** `daily_submission_limit: number`.
- Respons `POST .../submissions` **+** `remaining_today: number`; error `429 limit_reached` saat batas tercapai.
- `GET .../leaderboard?board=private` → `403 leaderboard_locked` bila kompetisi belum berakhir (non-admin).

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/admin/competitions/{slug}/ground-truth` | admin | `multipart: file` CSV `id,target,split` |

## Selesai bila

- [ ] Submission terunggah ke bucket privat `psd-submissions` (tanpa akses publik).
- [ ] Batas harian ditegakkan; submission ke-(limit+1) → `429` dengan sisa kuota benar.
- [ ] Submission dengan ground truth dinilai (status `scored`, `public_score` & `private_score` terisi).
- [ ] Leaderboard publik terurut benar sesuai arah metrik; privat terkunci sampai kompetisi berakhir (admin bisa intip).
- [ ] `private_score` tidak bocor di endpoint submission/leaderboard publik sebelum berakhir.
