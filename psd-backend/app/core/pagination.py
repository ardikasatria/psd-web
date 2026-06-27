from dataclasses import dataclass

from fastapi import Query
from pydantic import BaseModel


@dataclass
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, page_size=page_size)


def paginated(items: list, total: int, p: PageParams) -> dict:
    return {"items": items, "total": total, "page": p.page, "page_size": p.page_size}


class Paginated(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
