# PSD Backend — Indeks Langkah Pembangunan (Fase 0)

> **Cara pakai:** Ini backend **FastAPI**, repo **terpisah** dari frontend Next.js. Kerjakan **satu langkah per satu file** — berikan file langkah ke agen Cursor, selesaikan & uji, baru lanjut ke berikutnya. Tujuannya agar tiap increment ringan dan teruji, bukan sekaligus berat.

## Konteks

Backend ini mengimplementasikan **kontrak API** yang sudah didefinisikan di dokumen frontend (*PSD_Frontend_Fase0_Instruksi_Cursor.md*, Bagian 8). Kontrak itu adalah **sumber kebenaran bersama**: bentuk respons, paginasi, dan amplop error di sini harus sama persis dengan yang dipakai mock frontend, supaya saat frontend di-flip (`NEXT_PUBLIC_USE_MOCKS=false`) semuanya langsung cocok.

## Konvensi yang dipegang semua langkah

- Prefix: semua endpoint di bawah `/api/v1`.
- Paginasi: respons list = `{ items, total, page, page_size }`.
- Error: `{ "error": { "code": string, "message": string, "details"?: object } }` + kode HTTP sesuai.
- Penamaan field: `snake_case` (mis. `avatar_url`, `updated_at`) — cocok dengan kontrak frontend.
- Auth: header `Authorization: Bearer <token>`.
- Arsitektur: **modular monolith** — satu app, banyak modul rapi. Bukan microservices.

## Daftar Langkah

| Langkah | Isi | Status |
|---|---|---|
| **0** | Indeks ini (peta jalan + konvensi) | ✅ |
| **1** | Setup proyek & struktur (skeleton FastAPI, config, health) | ✅ disertakan |
| **2** | Docker Compose & infrastruktur (Postgres, Redis, MinIO) | ✅ disertakan |
| **3** | Database & fondasi skema (SQLAlchemy, Alembic, paginasi, error, tabel User) | ✅ disertakan |
| **4** | Modul Auth (register / login / me, JWT) | ⏳ batch berikutnya |
| **5** | Modul Registry (projects / datasets / models) | ⏳ |
| **6** | Modul Kompetisi & Event (+ leaderboard, submission stub) | ⏳ |
| **7** | Modul Komunitas & Belajar (forum, course, learning path, users, notebooks) | ⏳ |
| **8** | Seed data (sama dengan mock frontend) + sambung frontend + uji E2E | ⏳ |
| **9** | Pengerasan (Meilisearch, unggah MinIO, logging, test) | ⏳ |

## Aturan untuk agen Cursor

1. Kerjakan **hanya langkah yang sedang diberikan**. Jangan membangun endpoint dari langkah berikutnya.
2. Patuhi konvensi di atas tanpa kecuali.
3. Setelah selesai, jalankan kriteria "Selesai bila" di akhir tiap file sebelum lanjut.

> Setelah Langkah 1–3 berjalan (backend hidup di Docker + DB siap), minta lanjutan untuk Langkah 4 dan seterusnya.
