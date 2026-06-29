# Engagement Aset — Suka, Bagikan, Unduh, Statistik Profil

Setiap aset (proyek/dataset/model) punya bar statistik engagement; profil menampilkan agregat total suka.

## UI

| Komponen | Lokasi |
|----------|--------|
| `AssetStatBar` | Detail aset (`RepoDetailContent`) |
| `ProfileEngagementStats` | Halaman profil publik |

### AssetStatBar
- **Suka** — toggle optimistik (nonaktif untuk pemilik)
- **Bagikan** — feed, forum/diskusi, eksternal (`navigator.share`), salin tautan
- **Unduh** — jika ada file unduh
- **Dilihat** — read-only counter

## API

```
GET  /api/v1/assets/{kind}/{slug}/stats
POST /api/v1/assets/{kind}/{slug}/love
POST /api/v1/assets/{kind}/{slug}/share   { "channel": "feed"|"forum"|"external"|"link" }
POST /api/v1/assets/{kind}/{slug}/download
POST /api/v1/assets/{kind}/{slug}/view
GET  /api/v1/users/{username}/stats
```

`kind`: `project` | `dataset` | `model`

## Deploy

```bash
docker compose exec backend alembic upgrade head   # migrasi 052_engagement
docker compose up -d --build backend frontend
```

## Catatan

- Suka aset lama (`/repos/{id}/like`) dialihkan ke modul engagement (satu jalur counter).
- Profil menyertakan field `engagement` dengan agregat sumber tunggal dari backend.
