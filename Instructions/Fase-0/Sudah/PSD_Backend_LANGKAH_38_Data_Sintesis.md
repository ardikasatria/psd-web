# Langkah 38 — Mesin Data Sintesis (OpenAI + Generator Lokal)

> **Tujuan:** Hasilkan dataset sintesis dari deskripsi masalah, hemat token, terkendali, berkonteks Indonesia; kuota dibatasi per pengguna & digerbang tier gamifikasi. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 13/15 (storage), 25 (tier), 37 (tim, opsional untuk Ruang Ide).

## Prinsip arsitektur (penting)

**LLM membuat _rencana_ generator, bukan baris datanya.** Satu panggilan OpenAI menghasilkan **spesifikasi** (skema + aturan tiap kolom: distribusi, kategori, provider). Lalu **generator lokal** (numpy + Faker locale `id_ID`) membuat N baris secara deterministik — gratis, cepat, statistik terkendali, dan berkonteks Indonesia (nama/alamat/kota lokal). Ini yang membuat **kuota token layak**: biaya token tetap kecil walau menghasilkan 1 juta baris, dan kualitasnya jauh lebih baik daripada LLM mengarang baris satu per satu.

## 38.1 Dependensi & config

```bash
# requirements: openai, pandas, numpy, faker  → docker compose up -d --build
```

`app/core/config.py`: `OPENAI_API_KEY`, `AI_MODEL = "gpt-4o-mini"` (murah untuk output terstruktur).

## 38.2 Klien AI bersama — `app/core/ai/client.py`

```python
import os
from openai import OpenAI
from app.core.config import settings

_client = OpenAI(api_key=settings.OPENAI_API_KEY)

def chat_json(system: str, user: str, max_tokens: int = 1800):
    r = _client.chat.completions.create(
        model=settings.AI_MODEL, temperature=0.4,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens)
    return r.choices[0].message.content, r.usage   # (json_str, usage)
```

> Semua fitur AI lain (asisten, rekomendasi) memakai klien yang sama.

## 38.3 Spesifikasi & validasi — `app/modules/synthesis/spec.py`

```python
from pydantic import BaseModel

ALLOWED = {"int","float","category","bool","datetime","name","address","city","company","phone","id","text","formula"}

class ColumnSpec(BaseModel):
    name: str
    dtype: str
    params: dict = {}

class DatasetSpec(BaseModel):
    name: str
    description: str
    columns: list[ColumnSpec]

    def validate_types(self):
        bad = [c.name for c in self.columns if c.dtype not in ALLOWED]
        if bad: raise ValueError(f"dtype tidak didukung: {bad}")
```

## 38.4 Generator lokal — `app/modules/synthesis/engine.py`

```python
import numpy as np, pandas as pd
from faker import Faker

def _col(c, n, rng, fake):
    p, t = c.params, c.dtype
    if t == "id":        return np.arange(1, n + 1)
    if t == "int":       return rng.integers(p.get("min", 0), p.get("max", 100) + 1, n)
    if t == "float":
        d = p.get("dist", "normal")
        if d == "uniform":   return rng.uniform(p.get("min", 0), p.get("max", 1), n)
        if d == "lognormal": return rng.lognormal(p.get("mean", 0), p.get("sigma", 1), n)
        return rng.normal(p.get("mean", 0), p.get("std", 1), n)
    if t == "category":
        cats = p.get("categories", ["A", "B"]); w = p.get("weights")
        w = np.array(w) / np.sum(w) if w else None
        return rng.choice(cats, n, p=w)
    if t == "bool":      return rng.random(n) < p.get("p", 0.5)
    if t == "datetime":
        start = np.datetime64(p.get("start", "2023-01-01")); end = np.datetime64(p.get("end", "2024-12-31"))
        days = (end - start).astype("timedelta64[D]").astype(int)
        return start + rng.integers(0, max(days, 1), n).astype("timedelta64[D]")
    if t == "name":      return [fake.name() for _ in range(n)]
    if t == "address":   return [fake.address().replace("\n", ", ") for _ in range(n)]
    if t == "city":      return [fake.city() for _ in range(n)]
    if t == "company":   return [fake.company() for _ in range(n)]
    if t == "phone":     return [fake.phone_number() for _ in range(n)]
    if t == "text":      return rng.choice(p.get("samples", ["lorem"]), n)
    return [None] * n

def generate(spec, n: int, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    fake = Faker("id_ID"); Faker.seed(seed)
    df = pd.DataFrame()
    for c in [c for c in spec.columns if c.dtype != "formula"]:
        df[c.name] = _col(c, n, rng, fake)
    for c in [c for c in spec.columns if c.dtype == "formula"]:
        df[c.name] = df.eval(c.params["expr"])          # ekspresi atas kolom lain
    return df
```

> `formula` memakai `DataFrame.eval` (aman dari kode arbitrer; hanya ekspresi aritmetika atas kolom). Tambah tipe lain seperlunya.

## 38.5 Kuota per tier — `app/modules/synthesis/quota.py`

```python
from app.modules.gamification.service import tier_for   # Langkah 25

SYNTH_TIER = {
    "Pemula":     {"plans_per_day": 3,   "max_rows": 2_000},
    "Kontributor":{"plans_per_day": 15,  "max_rows": 20_000},
    "Ahli":       {"plans_per_day": 40,  "max_rows": 100_000},
    "Master":     {"plans_per_day": 100, "max_rows": 500_000},
    "Grandmaster":{"plans_per_day": 300, "max_rows": 1_000_000},
}

def quota_for(user):
    return SYNTH_TIER.get(tier_for(user.reputation or 0), SYNTH_TIER["Pemula"])
```

> Token hanya terpakai pada **plan (LLM)**. Memakai spec yang sudah ada / diedit pengguna **tidak** memakai kuota LLM — hanya dibatasi `max_rows`. Ini mendorong reuse & hemat biaya.

## 38.6 Model — `app/modules/synthesis/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class SynthesisJob(Base):
    __tablename__ = "synthesis_jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"syn_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default="queued")   # queued|planning|generating|done|failed
    prompt: Mapped[str | None] = mapped_column(String, nullable=True)
    spec: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    n_rows: Mapped[int] = mapped_column(Integer, default=1000)
    used_llm: Mapped[bool] = mapped_column(Boolean, default=False)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    result_url: Mapped[str | None] = mapped_column(String, nullable=True)
    preview: Mapped[list | None] = mapped_column(JSON, nullable=True)
    dataset_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "synthesis jobs"
docker compose exec backend alembic upgrade head
```

## 38.7 Worker latar — `app/modules/synthesis/worker.py`

```python
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.db import async_session            # session maker
from app.core.storage import upload_asset
from app.core.ai.client import chat_json
from app.modules.synthesis.models import SynthesisJob
from app.modules.synthesis.spec import DatasetSpec
from app.modules.synthesis.engine import generate

PLAN_SYSTEM = (
  "Anda perancang dataset sintesis untuk konteks Indonesia. Keluarkan HANYA JSON valid "
  "dengan bentuk {name, description, columns:[{name,dtype,params}]}. dtype yang diizinkan: "
  "int,float,category,bool,datetime,name,address,city,company,phone,id,text,formula. "
  "Gunakan distribusi & kategori realistis sesuai domain. Jika permintaan berbahaya/ilegal, "
  "keluarkan {\"error\":\"alasan\"}."
)

async def run_synthesis_job(job_id: str):
    async with async_session() as db:
        job = (await db.execute(select(SynthesisJob).where(SynthesisJob.id == job_id))).scalar_one()
        try:
            if not job.spec:
                job.status = "planning"; await db.commit()
                raw, usage = chat_json(PLAN_SYSTEM, f"Masalah: {job.prompt}\nBuat skema dataset yang relevan.")
                import json
                data = json.loads(raw)
                if "error" in data: raise ValueError(data["error"])
                spec = DatasetSpec(**data); spec.validate_types()
                job.spec = spec.model_dump(); job.tokens_in = usage.prompt_tokens; job.tokens_out = usage.completion_tokens
            else:
                spec = DatasetSpec(**job.spec); spec.validate_types()
            job.status = "generating"; await db.commit()
            df = generate(spec, job.n_rows)
            url = upload_asset(f"synthesis/{job.id}.csv", df.to_csv(index=False).encode(), "text/csv")
            job.result_url = url
            job.preview = df.head(20).where(df.notna(), None).astype(str).to_dict(orient="records")
            job.status = "done"; await db.commit()
        except Exception as e:
            job.status = "failed"; job.error = str(e)[:500]; await db.commit()
```

## 38.8 Endpoint — `app/modules/synthesis/router.py`

```python
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.synthesis.models import SynthesisJob
from app.modules.synthesis.quota import quota_for
from app.modules.synthesis.worker import run_synthesis_job

router = APIRouter(tags=["synthesis"])

@router.get("/me/synthesis/quota")
async def my_quota(user=Depends(get_current_user), db=Depends(get_db)):
    cfg = quota_for(user)
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used = (await db.execute(select(func.count()).select_from(SynthesisJob).where(
        SynthesisJob.user_id == user.id, SynthesisJob.used_llm == True,
        SynthesisJob.created_at >= start))).scalar_one()
    return {"plans_per_day": cfg["plans_per_day"], "plans_used": used,
            "plans_left": max(cfg["plans_per_day"] - used, 0), "max_rows": cfg["max_rows"]}

@router.post("/synthesis/jobs", status_code=202)
async def create_job(body: dict, bg: BackgroundTasks, user=Depends(get_current_user), db=Depends(get_db)):
    cfg = quota_for(user)
    n_rows = min(int(body.get("n_rows", 1000)), cfg["max_rows"])
    has_spec = bool(body.get("spec"))
    if not has_spec:
        if not body.get("prompt"): raise ApiError(422, "no_input", "Beri prompt atau spec")
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        used = (await db.execute(select(func.count()).select_from(SynthesisJob).where(
            SynthesisJob.user_id == user.id, SynthesisJob.used_llm == True,
            SynthesisJob.created_at >= start))).scalar_one()
        if used >= cfg["plans_per_day"]:
            raise ApiError(429, "quota_exceeded",
                           f"Kuota sintesis harian habis ({cfg['plans_per_day']}). Naik tier dengan berkontribusi untuk kuota lebih besar.")
    job = SynthesisJob(user_id=user.id, team_id=body.get("team_id"), status="queued",
                       prompt=body.get("prompt"), spec=body.get("spec"), n_rows=n_rows, used_llm=not has_spec)
    db.add(job); await db.commit()
    bg.add_task(run_synthesis_job, job.id)
    return {"job_id": job.id, "status": job.status}

def _ser(j):
    return {"id": j.id, "status": j.status, "prompt": j.prompt, "spec": j.spec, "n_rows": j.n_rows,
            "result_url": j.result_url, "preview": j.preview, "dataset_slug": j.dataset_slug, "error": j.error}

@router.get("/synthesis/jobs/{jid}")
async def job_status(jid: str, user=Depends(get_current_user), db=Depends(get_db)):
    j = (await db.execute(select(SynthesisJob).where(SynthesisJob.id == jid, SynthesisJob.user_id == user.id))).scalar_one_or_none()
    if not j: raise ApiError(404, "not_found", "Job tidak ditemukan")
    return _ser(j)

@router.get("/me/synthesis/jobs")
async def my_jobs(user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(select(SynthesisJob).where(SynthesisJob.user_id == user.id)
            .order_by(SynthesisJob.created_at.desc()).limit(30))).scalars().all()
    return {"items": [_ser(j) for j in rows]}
```

## 38.9 Terbitkan jadi dataset (opsional, label sintesis)

```python
@router.post("/synthesis/jobs/{jid}/publish")
async def publish_dataset(jid: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    j = (await db.execute(select(SynthesisJob).where(SynthesisJob.id == jid, SynthesisJob.user_id == user.id))).scalar_one_or_none()
    if not j or j.status != "done": raise ApiError(400, "not_ready", "Job belum selesai")
    # buat Repo kind="dataset" (Langkah 5/15) dengan file dari j.result_url,
    # metadata: synthetic=True, generation_spec=j.spec (reproducible), visibility dari body
    # ... set j.dataset_slug
    return {"dataset_slug": j.dataset_slug}
```

> **Label wajib:** dataset hasil sintesis ditandai `synthetic: true` dan menyimpan `generation_spec` (reproducible). Jangan biarkan data sintesis tampak seperti data resmi (BPS/BMKG). Tampilkan badge "Data Sintesis" di UI.

Wire router di `main.py`.

## 38.10 Pembaruan Kontrak (Bagian 8)

- Entitas `SynthesisJob { id, status, prompt, spec, n_rows, result_url, preview, dataset_slug, error }`; `SynthQuota { plans_per_day, plans_used, plans_left, max_rows }`.
- Dataset (Repo) **+** `synthetic: boolean`, `generation_spec?`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/me/synthesis/quota` | ✓ | kuota tier hari ini |
| POST | `/synthesis/jobs` | ✓ | `{ prompt? \| spec?, n_rows, team_id? }` → async |
| GET | `/synthesis/jobs/{id}` | ✓ | status + hasil |
| GET | `/me/synthesis/jobs` | ✓ | riwayat |
| POST | `/synthesis/jobs/{id}/publish` | ✓ | terbitkan sbg dataset (sintesis) |

## Selesai bila

- [ ] LLM menghasilkan **spec** (bukan baris); generator lokal membuat N baris deterministik berlocale `id_ID`.
- [ ] Kuota plan/hari digerbang tier; spec yang diedit/diulang tidak memakai kuota LLM; `max_rows` dibatasi tier.
- [ ] Job berjalan async; status dapat dipantau; hasil punya preview + URL unduh.
- [ ] Token OpenAI tercatat per job (pemantauan biaya).
- [ ] Dataset hasil ditandai sintesis + menyimpan spec; tidak menyamar sebagai data resmi.
