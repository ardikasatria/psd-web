# Pengajuan Kernel Notebook

Fitur ini memungkinkan pengguna meminta akses **kernel server** di luar tier gamifikasi default (biasanya tier Ahli+).

## Tipe pemohon

| Tipe | Field wajib |
|------|-------------|
| **Mahasiswa** (`student`) | NIM, upload KTM (JPEG/PNG/WebP/PDF, maks. 5 MB) |
| **Umum** (`umum`) | Alasan penggunaan; institusi opsional |

## Alur

1. Pengguna mengisi form di `/notebooks/kernel-request`
2. Staff meninjau di **Admin → Kernel notebook** (`/admin/notebook-kernel-requests`)
3. **Setujui** → grant kernel setara tier Ahli (`notebook_kernel_granted` di user settings)
4. **Tolak** → notifikasi ke pengguna

## API

- `POST /api/v1/me/notebook-kernel-request` — multipart form
- `GET /api/v1/me/notebook-kernel-request`
- `GET /api/v1/admin/notebook-kernel-requests`
- `PATCH /api/v1/admin/notebook-kernel-requests/{id}`
- `GET /api/v1/admin/notebook-kernel-requests/{id}/ktm-url` — presigned URL (staff only)

## Migrasi

```bash
alembic upgrade head  # 050_notebook_kernel_requests
```
