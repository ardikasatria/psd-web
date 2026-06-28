"""Penyimpanan notebook di PostgreSQL."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.learn.models import Notebook
from psd_notebook.blank import blank_notebook


class NotebookStore:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count(self, user_id: str) -> int:
        return int(
            (
                await self.db.execute(
                    select(func.count()).select_from(Notebook).where(Notebook.owner_id == user_id)
                )
            ).scalar_one()
        )

    async def create(self, user_id: str, title: str) -> Notebook:
        n = Notebook(
            title=title,
            owner_id=user_id,
            content_json=blank_notebook(),
        )
        self.db.add(n)
        await self.db.flush()
        return n

    async def get(self, notebook_id: str) -> Notebook | None:
        return (
            await self.db.execute(select(Notebook).where(Notebook.id == notebook_id))
        ).scalar_one_or_none()

    async def save_content(self, notebook: Notebook, content: dict) -> None:
        notebook.content_json = content

    async def content_or_blank(self, notebook: Notebook) -> dict:
        if notebook.content_json:
            return notebook.content_json
        blank = blank_notebook()
        notebook.content_json = blank
        return blank
