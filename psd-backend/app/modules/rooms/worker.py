import uuid

from sqlalchemy import select

from app.core.db import async_session
from app.core.storage import upload_asset
from app.modules.categories.util import slugify
from app.modules.repos.models import Repo
from app.modules.rooms.models import IdeaRoom, RoomProblem
from app.modules.synthesis.engine import generate
from app.modules.synthesis.spec import DatasetSpec
from app.modules.teams.models import Team


async def run_room_data_job(room_id: str, n_rows: int):
    async with async_session() as db:
        r = (await db.execute(select(IdeaRoom).where(IdeaRoom.id == room_id))).scalar_one()
        p = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == room_id))).scalar_one()
        team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
        try:
            spec = DatasetSpec(**p.data_spec)
            spec.validate_types()
            df = generate(spec, n_rows)
            csv_bytes = df.to_csv(index=False).encode()
            url = upload_asset(f"rooms/{r.slug}/data.csv", csv_bytes, "text/csv")
            name = slugify(spec.name or f"data-{r.slug}")
            ds_slug = f"{team.slug}/{name}"
            if (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one_or_none():
                ds_slug = f"{ds_slug}-{uuid.uuid4().hex[:4]}"
            repo = Repo(
                kind="dataset",
                owner_id=r.founder_id,
                team_id=r.team_id,
                name=name,
                slug=ds_slug,
                description=spec.description,
                visibility="private",
                synthetic=True,
                generation_spec=p.data_spec,
                room_id=r.id,
                files=[
                    {
                        "path": "data.csv",
                        "url": url,
                        "size_bytes": len(csv_bytes),
                        "type": "text/csv",
                    }
                ],
            )
            db.add(repo)
            await db.commit()
            r.dataset_repo_slug = repo.slug
            r.status = "solving"
            r.generation_error = None
            await db.commit()
        except Exception as e:
            r.status = "closed"
            r.generation_error = str(e)[:500]
            await db.commit()
