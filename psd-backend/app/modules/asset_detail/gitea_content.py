"""Ambil konten aset dari Gitea (README, tree, file, branch, tag, kontributor)."""
from __future__ import annotations

import logging
from urllib.parse import quote

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gitea import files_view
from app.gitea.client import GiteaClient, GiteaError
from app.gitea.service import client_or_none, repo_gitea_coords
from app.gitea.settings import settings as gitea_settings
from app.modules.asset_detail import language, versioning
from app.modules.repos.models import Repo
from app.modules.teams.models import Team, TeamMember
from app.modules.users.models import User

log = logging.getLogger(__name__)

README_CANDIDATES = ("README.md", "readme.md", "Readme.md")


def gitea_linked(r: Repo) -> bool:
    return bool(r.gitea_repo_id or r.clone_url)


async def _resolve_ref(client: GiteaClient, owner: str, name: str, ref: str | None) -> str:
    if ref:
        return ref
    try:
        meta = await client.get_repo(owner, name)
        return meta.get("default_branch") or gitea_settings.DEFAULT_BRANCH or "main"
    except GiteaError:
        return gitea_settings.DEFAULT_BRANCH or "main"


async def _commit_sha(client: GiteaClient, owner: str, name: str, ref: str) -> str | None:
    try:
        branch = await client.get_branch(owner, name, ref)
        commit = branch.get("commit") or {}
        return commit.get("id") or commit.get("sha")
    except GiteaError:
        pass
    try:
        commits = await client.list_commits(owner, name, sha=ref, limit=1)
        if commits:
            return commits[0].get("sha")
    except GiteaError:
        pass
    return None


async def fetch_readme_text(r: Repo, ref: str | None = None) -> str | None:
    if not gitea_linked(r):
        return None
    client = client_or_none()
    if not client:
        return None
    owner, name = repo_gitea_coords(r)
    async with client:
        use_ref = await _resolve_ref(client, owner, name, ref)
        for path in README_CANDIDATES:
            try:
                return await files_view.get_file_text(client, owner, name, path, use_ref)
            except GiteaError as e:
                if e.status == 404:
                    continue
                log.warning("gitea_readme_error", extra={"repo": r.slug, "path": path, "status": e.status})
                return None
    return None


async def fetch_tree_paths(r: Repo, ref: str | None = None) -> tuple[list[str], str]:
    if not gitea_linked(r):
        return [], gitea_settings.DEFAULT_BRANCH or "main"
    client = client_or_none()
    if not client:
        return [], gitea_settings.DEFAULT_BRANCH or "main"
    owner, name = repo_gitea_coords(r)
    async with client:
        use_ref = await _resolve_ref(client, owner, name, ref)
        sha = await _commit_sha(client, owner, name, use_ref)
        if not sha:
            return [], use_ref
        try:
            tree = await client.get_git_tree(owner, name, sha, recursive=True)
            paths = [e["path"] for e in tree.get("tree", []) if e.get("type") == "blob" and e.get("path")]
            return paths, use_ref
        except GiteaError as e:
            log.warning("gitea_tree_error", extra={"repo": r.slug, "status": e.status})
            return [], use_ref


def gitea_raw_url(r: Repo, path: str, ref: str) -> str:
    if r.clone_url:
        base = r.clone_url.removesuffix(".git")
        return f"{base}/raw/branch/{quote(ref)}/{quote(path)}"
    owner, name = repo_gitea_coords(r)
    base = gitea_settings.BASE_URL.rstrip("/")
    return f"{base}/{owner}/{name}/raw/branch/{quote(ref)}/{quote(path)}"


async def fetch_file(r: Repo, path: str, ref: str | None = None) -> dict | None:
    if language.is_binary(path):
        use_ref = ref or gitea_settings.DEFAULT_BRANCH or "main"
        return {
            "path": path,
            "language": "binary",
            "is_binary": True,
            "download_url": gitea_raw_url(r, path, use_ref) if gitea_linked(r) else None,
        }
    if not gitea_linked(r):
        return None
    client = client_or_none()
    if not client:
        return None
    owner, name = repo_gitea_coords(r)
    async with client:
        use_ref = await _resolve_ref(client, owner, name, ref)
        try:
            content = await files_view.get_file_text(client, owner, name, path, use_ref)
        except GiteaError as e:
            if e.status == 404:
                return None
            log.warning("gitea_file_error", extra={"repo": r.slug, "path": path, "status": e.status})
            return None
        return {
            "path": path,
            "content": content,
            "language": language.detect_language(path),
            "is_binary": False,
            "download_url": gitea_raw_url(r, path, use_ref),
        }


async def fetch_branches(r: Repo) -> list[dict] | None:
    if not gitea_linked(r):
        return None
    client = client_or_none()
    if not client:
        return None
    owner, name = repo_gitea_coords(r)
    async with client:
        try:
            meta = await client.get_repo(owner, name)
            default = meta.get("default_branch") or gitea_settings.DEFAULT_BRANCH or "main"
            rows = await client.list_branches(owner, name)
        except GiteaError as e:
            log.warning("gitea_branches_error", extra={"repo": r.slug, "status": e.status})
            return None
        out = []
        for row in rows:
            commit = row.get("commit") or {}
            out.append(
                {
                    "name": row.get("name", ""),
                    "commit_sha": (commit.get("id") or commit.get("sha") or "")[:7],
                    "is_default": row.get("name") == default,
                }
            )
        out.sort(key=lambda b: (not b.get("is_default"), b["name"].lower()))
        return out


async def create_branch(r: Repo, branch_name: str, from_ref: str) -> dict | None:
    if not gitea_linked(r):
        return None
    client = client_or_none()
    if not client:
        return None
    owner, name = repo_gitea_coords(r)
    async with client:
        try:
            data = await client.create_branch(owner, name, new=branch_name, old=from_ref)
            commit = data.get("commit") or {}
            return {
                "name": data.get("name", branch_name),
                "commit_sha": (commit.get("id") or commit.get("sha") or "new000")[:7],
                "is_default": False,
            }
        except GiteaError as e:
            if e.status == 409:
                from app.core.errors import ApiError

                raise ApiError(409, "branch_exists", "Branch sudah ada.") from e
            log.warning("gitea_create_branch_error", extra={"repo": r.slug, "status": e.status})
            return None


async def fetch_versions(r: Repo) -> list[dict] | None:
    if not gitea_linked(r):
        return None
    client = client_or_none()
    if not client:
        return None
    owner, name = repo_gitea_coords(r)
    async with client:
        try:
            tags = await client.list_tags(owner, name)
        except GiteaError as e:
            log.warning("gitea_tags_error", extra={"repo": r.slug, "status": e.status})
            return None
        names = [t.get("name") for t in tags if t.get("name")]
        sorted_names = versioning.sort_versions(names)
        return [{"tag": t, "name": t} for t in sorted_names]


async def fetch_commit_authors(r: Repo) -> list[dict]:
    if not gitea_linked(r):
        return []
    client = client_or_none()
    if not client:
        return []
    owner, name = repo_gitea_coords(r)
    counts: dict[str, int] = {}
    async with client:
        try:
            commits = await client.list_commits(owner, name, limit=100)
        except GiteaError:
            return []
        for c in commits:
            author = c.get("author") or {}
            login = author.get("login") or author.get("username")
            if not login:
                commit = c.get("commit") or {}
                author_meta = commit.get("author") or {}
                login = author_meta.get("name") or author_meta.get("email") or ""
            login = str(login).strip()
            if login:
                counts[login] = counts.get(login, 0) + 1
    return [{"username": u, "commits": n} for u, n in counts.items()]


async def team_member_rows(db: AsyncSession, team_id: str | None) -> list[dict]:
    if not team_id:
        return []
    rows = (
        await db.execute(
            select(TeamMember, User, Team)
            .join(User, User.id == TeamMember.user_id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(TeamMember.team_id == team_id)
        )
    ).all()
    return [
        {"username": user.username, "avatar_url": user.avatar_url, "team": team.name}
        for _m, user, team in rows
    ]
