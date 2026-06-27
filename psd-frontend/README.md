# PSD Frontend

Frontend Next.js untuk **Projek Sains Data** (Fase 0).

## Prasyarat

- Node.js 20+
- Backend API berjalan di `http://localhost:8000` (lihat folder `../psd-backend`)

## Setup

```bash
npm install
cp .env.example .env.local
```

`.env.local` untuk API nyata:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_APP_NAME=Projek Sains Data
```

## Jalankan

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Akun demo (setelah `python -m app.seed` di backend)

| Email | Password |
|---|---|
| `satria@psd.id` | `demo` |
| `budi@psd.id` | `demo` |

## Struktur

- `src/app/` — rute Next.js (App Router)
- `src/lib/api/` — client API (satu pintu ke backend)
- `src/lib/mocks/` — MSW handlers (aktif jika `NEXT_PUBLIC_USE_MOCKS=true`)
- `src/components/features/` — halaman & blok fitur PSD
