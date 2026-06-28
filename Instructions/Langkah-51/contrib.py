"""
Orkestrasi alur kontribusi (Langkah 51).

open_contribution : fork → branch kerja → (opsional commit) → buka PR → notifikasi pemilik.
submit_review     : review (approve/request changes/comment) → notifikasi penulis.
merge_contribution: cek mergeable → merge → notifikasi penulis.
comment           : komentar PR → notifikasi peserta.
"""
from __future__ import annotations

from . import seams
from .client import GiteaError, GiteaPRClient, make_operations


async def _ensure_fork(client: GiteaPRClient, base_owner: str, base_repo: str,
                       fork_owner: str) -> dict:
    """Fork idempoten: bila sudah ada, ambil repo fork yang ada."""
    try:
        return await client.fork(base_owner, base_repo)
    except GiteaError as e:
        if e.status in (409, 422):  # fork sudah ada
            return await client.get_repo(fork_owner, base_repo)
        raise


async def open_contribution(client: GiteaPRClient, base_owner: str, base_repo: str, *,
                            contributor_user_id: str, title: str, work_branch: str,
                            base_branch: str = "main", body: str = "",
                            files: list[dict] | None = None, notify=None) -> dict:
    notify = notify or seams.notify
    fork_owner = seams.contributor_namespace(contributor_user_id)

    await _ensure_fork(client, base_owner, base_repo, fork_owner)
    await client.create_branch(fork_owner, base_repo, new=work_branch, old=base_branch)

    if files:  # commit perubahan ke branch fork sebelum PR
        await client.change_files(fork_owner, base_repo, message=title,
                                  files=make_operations(files, "update"), branch=work_branch)

    pr = await client.create_pull(base_owner, base_repo, title=title, body=body,
                                  head=f"{fork_owner}:{work_branch}", base=base_branch)
    notify(seams.repo_owner_user(base_owner, base_repo), "pr_opened",
           {"index": pr["number"], "title": title, "repo": f"{base_owner}/{base_repo}"})
    return pr


async def submit_review(client: GiteaPRClient, owner: str, repo: str, index: int, *,
                        event: str, body: str = "", notify=None) -> dict:
    notify = notify or seams.notify
    review = await client.create_review(owner, repo, index, event=event, body=body)
    pr = await client.get_pull(owner, repo, index)
    notify(seams.pull_author_user(pr), "pr_reviewed",
           {"index": index, "event": event, "repo": f"{owner}/{repo}"})
    return review


async def merge_contribution(client: GiteaPRClient, owner: str, repo: str, index: int, *,
                             method: str = "merge", delete_branch: bool = False,
                             notify=None) -> bool:
    notify = notify or seams.notify
    pr = await client.get_pull(owner, repo, index)
    if pr.get("merged"):
        return True
    if pr.get("mergeable") is False:
        raise GiteaError(409, "PR belum bisa di-merge (konflik atau cek gagal).")
    ok = await client.merge_pull(owner, repo, index, method=method,
                                 delete_branch=delete_branch)
    if ok:
        notify(seams.pull_author_user(pr), "pr_merged",
               {"index": index, "repo": f"{owner}/{repo}"})
    return ok


async def comment(client: GiteaPRClient, owner: str, repo: str, index: int, *,
                  body: str, notify=None) -> dict:
    notify = notify or seams.notify
    c = await client.create_comment(owner, repo, index, body=body)
    pr = await client.get_pull(owner, repo, index)
    notify(seams.pull_author_user(pr), "pr_commented",
           {"index": index, "repo": f"{owner}/{repo}"})
    return c
