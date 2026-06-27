from typing import Literal

from pydantic import BaseModel


class OwnerRef(BaseModel):
    username: str
    type: Literal["user", "org"]
    avatar_url: str | None = None
    is_official: bool = False
