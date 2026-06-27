import json

from sqlalchemy import select

from app.core.ai.client import chat_json
from app.core.db import async_session
from app.core.storage import upload_asset
from app.modules.synthesis.engine import generate
from app.modules.synthesis.models import SynthesisJob
from app.modules.synthesis.spec import DatasetSpec

PLAN_SYSTEM = (
    "Anda perancang dataset sintesis untuk konteks Indonesia. Keluarkan HANYA JSON valid "
    "dengan bentuk {name, description, columns:[{name,dtype,params}]}. dtype yang diizinkan: "
    "int,float,category,bool,datetime,name,address,city,company,phone,id,text,formula. "
    "Gunakan distribusi & kategori realistis sesuai domain. Jika permintaan berbahaya/ilegal, "
    'keluarkan {"error":"alasan"}.'
)


async def run_synthesis_job(job_id: str):
    async with async_session() as db:
        job = (await db.execute(select(SynthesisJob).where(SynthesisJob.id == job_id))).scalar_one()
        try:
            if not job.spec:
                job.status = "planning"
                await db.commit()
                raw, usage = chat_json(PLAN_SYSTEM, f"Masalah: {job.prompt}\nBuat skema dataset yang relevan.")
                data = json.loads(raw)
                if "error" in data:
                    raise ValueError(data["error"])
                spec = DatasetSpec(**data)
                spec.validate_types()
                job.spec = spec.model_dump()
                job.tokens_in = usage.prompt_tokens
                job.tokens_out = usage.completion_tokens
            else:
                spec = DatasetSpec(**job.spec)
                spec.validate_types()
            job.status = "generating"
            await db.commit()
            df = generate(spec, job.n_rows)
            url = upload_asset(
                f"synthesis/{job.id}.csv",
                df.to_csv(index=False).encode(),
                "text/csv",
            )
            job.result_url = url
            preview_df = df.head(20).fillna("")
            job.preview = preview_df.astype(str).to_dict(orient="records")
            job.status = "done"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)[:500]
            await db.commit()
