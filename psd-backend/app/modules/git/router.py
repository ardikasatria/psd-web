from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.modules.git import ssh_keys
from app.modules.users.models import User

router = APIRouter(tags=["git"])


@router.get("/me/git/info")
async def git_info(user: User = Depends(get_current_user)):
    return ssh_keys.git_info_payload(user)


@router.get("/me/git/ssh-keys")
async def list_my_ssh_keys(user: User = Depends(get_current_user)):
    items = await ssh_keys.list_ssh_keys(user)
    return {"items": items}


@router.post("/me/git/ssh-keys", status_code=201)
async def add_my_ssh_key(body: dict, user: User = Depends(get_current_user)):
    row = await ssh_keys.add_ssh_key(
        user,
        title=body.get("title", ""),
        key=body.get("key", ""),
    )
    return row


@router.delete("/me/git/ssh-keys/{key_id}", status_code=204)
async def delete_my_ssh_key(key_id: int, user: User = Depends(get_current_user)):
    await ssh_keys.delete_ssh_key(user, key_id)
