import meilisearch

from app.core.config import settings

client = meilisearch.Client(settings.MEILI_URL, settings.MEILI_KEY)


def ensure_indexes():
    repos = client.index("repos")
    repos.update_searchable_attributes(["name", "description", "tags"])
    repos.update_filterable_attributes(["kind", "tags", "visibility"])
    repos.update_sortable_attributes(["downloads", "likes", "updated_at"])
    comps = client.index("competitions")
    comps.update_searchable_attributes(["title", "tags", "sponsor"])
    comps.update_filterable_attributes(["status", "tags"])


def index_repo(r):
    client.index("repos").add_documents(
        [
            {
                "id": r.id,
                "slug": r.slug,
                "kind": r.kind,
                "name": r.name,
                "description": r.description,
                "tags": r.tags,
                "visibility": r.visibility,
                "owner": r.owner.username,
                "likes": r.likes,
                "downloads": r.downloads,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
        ]
    )


def delete_repo_doc(repo_id: str):
    client.index("repos").delete_document(repo_id)


def index_competition(c):
    client.index("competitions").add_documents(
        [
            {
                "id": c.id,
                "slug": c.slug,
                "title": c.title,
                "sponsor": c.sponsor,
                "status": c.status,
                "tags": c.tags,
            }
        ]
    )


def delete_competition_doc(comp_id: str):
    client.index("competitions").delete_document(comp_id)
