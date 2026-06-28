"""CLI backfill repo lama ke Gitea."""
import asyncio

from app.gitea.client import GiteaClient
from app.gitea.migration import backfill_all
from app.gitea.settings import settings


async def main():
    if not settings.ADMIN_TOKEN:
        print("PSD_GITEA_ADMIN_TOKEN belum diset.")
        return
    async with GiteaClient(settings.BASE_URL, settings.ADMIN_TOKEN) as client:
        summary = await backfill_all(client, flip=False)
    print(f"OK: {summary['ok']}, gagal: {len(summary['failed'])}")
    for repo_id, err in summary["failed"]:
        print(f"  FAIL {repo_id}: {err}")


if __name__ == "__main__":
    asyncio.run(main())
