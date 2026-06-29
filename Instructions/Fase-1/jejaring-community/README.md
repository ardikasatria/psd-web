# Jejaring Komunitas — Penemuan & Follow

Panel penemuan orang di `/community` + tombol **Ikuti** terhubung ke API sosial Gitea/PSD.

## Lokasi UI

| Halaman | Path |
|---------|------|
| Feed & jejaring | `/community` |
| Daftar per kategori | `/community/discovery/[kind]` |

`kind`: `top-tier` | `popular` | `new` | `achievements` | `similar`

## Panel sidebar (urutan personalisasi)

1. **Sesama [afiliasi]** — hanya jika login + punya afiliasi
2. Tier teratas
3. Populer
4. Pencapaian terbaru
5. Anggota baru

Setiap baris: avatar, @username, chip alasan, tombol **Ikuti/Mengikuti**.

## API

```
GET /api/v1/discovery/panels?limit=8
GET /api/v1/discovery/{kind}?page=1
POST /api/v1/users/{username}/follow
DELETE /api/v1/users/{username}/follow
```

## Deploy

```bash
docker compose exec backend alembic upgrade head   # migrasi 051_discovery_fields
docker compose up -d --build backend frontend
```

Field baru di `users`: `affiliation`, `follower_count`, `post_like_total`.

## Follow

Tombol ikuti memakai modul sosial yang sudah ada — optimistik, invalidate cache profil & discovery.
