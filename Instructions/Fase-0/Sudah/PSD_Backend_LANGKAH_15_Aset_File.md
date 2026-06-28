# Langkah 15 — Aset: Unggah & Kelola File (S3/MinIO)

> **Tujuan:** Aset memiliki file sungguhan (unggah/hapus ke S3/MinIO), serta edit metadata (deskripsi, tags, lisensi, visibility, README). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 5 & 13 (storage S3).

## 15.1 Bucket & helper aset — `app/core/storage.py`

Tambah bucket aset (boleh sama pola dengan media). Di config:

```python
S3_ASSETS_BUCKET: str = "psd-assets"
S3_ASSETS_PUBLIC_BASE_URL: str = "http://localhost:9000/psd-assets"
```

Helper:

```python
def upload_asset(key: str, data: bytes, content_type: str) -> str:
    _s3.put_object(Bucket=settings.S3_ASSETS_BUCKET, Key=key, Body=data, ContentType=content_type)
    return f"{settings.S3_ASSETS_PUBLIC_BASE_URL.rstrip('/')}/{key}"

def delete_asset(key: str) -> None:
    _s3.delete_object(Bucket=settings.S3_ASSETS_BUCKET, Key=key)
```

> Bucket `psd-assets` sudah dibuat & public-read di compose (Langkah 2). Untuk repo privat, file privat butuh presigned download — tunda ke pengerasan.

## 15.2 Kepemilikan — helper di `app/modules/repos/router.py`

```python
async def _owned_repo(db, repo_id, user) -> Repo:
    r = await _get_repo(db, repo_id)               # _get_repo dari Langkah 11
    if r.owner_id != user.id and user.role != "admin":
        raise ApiError(403, "forbidden", "Hanya pemilik yang bisa mengubah aset ini")
    return r
```

## 15.3 Unggah & hapus file

```python
import uuid
from fastapi import UploadFile, File
from app.core.storage import upload_asset, delete_asset

@router.post("/repos/{repo_id}/files", status_code=201)
async def add_file(repo_id: str, file: UploadFile = File(...),
                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    r = await _owned_repo(db, repo_id, user)
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:               # batas Fase 0: 50MB
        raise ApiError(413, "too_large", "Ukuran maksimal 50 MB")
    name = file.filename or f"file-{uuid.uuid4().hex}"
    key = f"repos/{repo_id}/{name}"
    url = upload_asset(key, data, file.content_type or "application/octet-stream")
    entry = {"path": name, "size_bytes": len(data),
             "type": file.content_type or "application/octet-stream", "url": url}
    r.files = [f for f in (r.files or []) if f["path"] != name] + [entry]   # replace bila nama sama
    await db.commit()
    return entry

@router.delete("/repos/{repo_id}/files", status_code=204)
async def remove_file(repo_id: str, path: str, user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    r = await _owned_repo(db, repo_id, user)
    r.files = [f for f in (r.files or []) if f["path"] != path]
    await db.commit()
    try:
        delete_asset(f"repos/{repo_id}/{path}")
    except Exception:
        pass
```

## 15.4 Edit metadata

```python
@router.patch("/repos/{repo_id}")
async def update_repo(repo_id: str, body: dict, user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    r = await _owned_repo(db, repo_id, user)
    for k in ("description", "tags", "license", "visibility", "readme_md"):
        if k in body:
            setattr(r, k, body[k])
    await db.commit()
    return to_detail(r)        # to_detail dari Langkah 5
```

## 15.5 Matangkan endpoint "buat aset"

Pada `create_ep` (Langkah 5), terima juga `readme_md` & `license`:

```python
r = Repo(kind=kind, owner_id=user.id, name=body["name"],
         slug=f"{user.username}/{body['name']}", description=body.get("description", ""),
         tags=body.get("tags", []), visibility=body.get("visibility", "public"),
         readme_md=body.get("readme_md", ""), license=body.get("license"))
```

## 15.6 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `RepoDetail.files[]` kini `{ path, size_bytes, type, url }` (tambah `url`).

| Metode | Path | Auth | Body | Respons |
|---|---|---|---|---|
| POST | `/repos/{repo_id}/files` | ✓ pemilik | `multipart: file` (≤50MB) | `FileEntry` |
| DELETE | `/repos/{repo_id}/files?path=` | ✓ pemilik | — | 204 |
| PATCH | `/repos/{repo_id}` | ✓ pemilik | `{ description?, tags?, license?, visibility?, readme_md? }` | `RepoDetail` |

`POST /{kind}` (buat) kini menerima `readme_md` & `license`.

## Selesai bila

- [ ] Pemilik dapat mengunggah & menghapus file aset; file tersimpan di `psd-assets` dan URL-nya bisa dibuka.
- [ ] Pemilik dapat mengedit deskripsi/tags/lisensi/visibility/README; non-pemilik → 403.
- [ ] `RepoDetail.files` memuat `url`; `liked` (Langkah 11) tetap ada.
- [ ] Buat aset menerima README & lisensi awal.
