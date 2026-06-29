# Pengaturan Git & SSH di PSD

Pengguna mengelola **kunci SSH** untuk Git PSD langsung dari pengaturan akun — tanpa harus login terpisah ke Gitea.

## Lokasi UI

- **Pengaturan → Git & SSH** — `/settings/git`
- Ringkasan pengaturan juga menampilkan shortcut ke halaman ini

## Alur pengguna

1. Buat kunci di laptop: `ssh-keygen -t ed25519 -C "email@..."`
2. Salin kunci publik: `cat ~/.ssh/id_ed25519.pub`
3. Buka `/settings/git` → isi label + tempel kunci → **Tambah kunci SSH**
4. Uji: `ssh -T git@git.<domain>`

## Backend

- `GET /api/v1/me/git/info` — host, username Gitea, perintah uji
- `GET /api/v1/me/git/ssh-keys` — daftar kunci
- `POST /api/v1/me/git/ssh-keys` — `{ title, key }`
- `DELETE /api/v1/me/git/ssh-keys/{id}`

Kunci disimpan di **Gitea** via Admin API (`/admin/users/{username}/keys`). Akun Gitea dibuat otomatis (`ensure_user`) saat kunci pertama ditambahkan.

## Prasyarat deploy

- `PSD_GITEA_ENABLED=true`
- `PSD_GITEA_ADMIN_TOKEN` terisi
- `PSD_OAUTH_GIT_BASE_URL` (mis. `https://git.projeksainsdata.com`)

## Catatan keamanan

- Hanya **kunci publik** yang dikirim ke server
- Kunci privat tidak pernah diunggah ke PSD
- Untuk HTTPS push, gunakan Personal Access Token di Gitea (lihat panduan bantuan)
