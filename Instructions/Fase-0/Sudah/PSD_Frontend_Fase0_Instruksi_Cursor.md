# PSD — Instruksi Agen Frontend (Fase 0)

> **Cara pakai:** Lampirkan file ini sebagai *context / rules* di Cursor (mis. `/.cursor/rules` atau attach ke chat agen). File ini adalah **sumber kebenaran** untuk pekerjaan frontend Fase 0. Jika ada konflik antara permintaan ad-hoc dan dokumen ini, ikuti dokumen ini dan tanyakan bila ragu.

---

## 1. Konteks Proyek

**Projek Sains Data (PSD)** adalah platform sains data kolaboratif lokal Indonesia — persilangan Hugging Face + Kaggle dengan jembatan ke UMKM/organisasi. Saat ini di **Fase 0 (MVP)**.

Arsitektur: **frontend dan backend TERPISAH**.
- Repo ini = **frontend Next.js saja**.
- Backend (FastAPI) dibangun belakangan. Frontend berbicara ke backend **hanya** lewat REST API.
- Di Fase 0, backend belum ada → frontend berjalan penuh memakai **mock** yang meniru kontrak API. Ketika backend siap, kita **flip** dari mock ke API nyata **tanpa mengubah kode komponen**.

Tujuan Fase 0: frontend hidup, semua halaman utama bisa dijelajahi dengan data demo, tema yang dibeli sudah terpasang, dan siap disambungkan ke backend.

---

## 2. Prinsip Wajib (Guardrails)

1. **Tema yang dibeli = sumber kebenaran visual.** Bangun halaman PSD dengan **mengomposisi komponen tema**. Jangan membuat sistem desain baru, jangan menimpa gaya tema, jangan mengubah file internal tema. Kustomisasi dilakukan di kode aplikasi (props, wrapper, layout), bukan dengan mengedit isi paket tema.
2. **Semua akses data lewat lapisan API client.** **Dilarang** memanggil `fetch`/`axios` langsung di komponen. Komponen hanya memakai fungsi dari `lib/api/*` (via TanStack Query). Tidak ada data yang di-*hardcode* di dalam komponen.
3. **Mock sekarang, backend nanti.** Lapisan mock (MSW) meniru kontrak API persis. Pergantian mock↔nyata dikendalikan **satu env flag**.
4. **Tipe & validasi terpusat.** Definisikan skema **Zod** untuk setiap entitas di `types/api.ts`; turunkan tipe TypeScript dari Zod. Validasi setiap respons API dengan Zod.
5. **Quality floor (tanpa perlu diminta):** responsif sampai mobile, *focus* keyboard terlihat, hormati `prefers-reduced-motion`, dan setiap layar punya state **loading / kosong / error** yang jelas.
6. **Copy berbahasa Indonesia, kalimat aktif, *sentence case*.** Tombol menyebut aksi yang terjadi ("Simpan perubahan", bukan "Submit"). Pesan error menjelaskan apa yang salah + cara memperbaikinya, bukan minta maaf. Layar kosong = ajakan bertindak.
7. **Jangan mengarang endpoint.** Hanya gunakan endpoint yang tercantum di **Bagian 8 (Kontrak API)**. Bila butuh endpoint baru, tambahkan dulu ke kontrak ini dan beri tahu.

---

## 3. Tumpukan & Dependensi

- **Next.js (App Router) + TypeScript** — kerangka utama.
- **Tema yang dibeli** — sistem komponen & gaya (kemungkinan berbasis Tailwind; sesuaikan dengan dokumentasi tema).
- **@tanstack/react-query** — pengambilan & caching data.
- **zod** — skema & validasi runtime, sumber tipe.
- **msw** (Mock Service Worker) — mock di lapisan jaringan untuk Fase 0.

Pemasangan (jika belum):

```bash
npm i @tanstack/react-query zod
npm i -D msw
npx msw init public/ --save
```

> **Penting (App Router):** Di Fase 0, lakukan pengambilan data di **Client Component** memakai TanStack Query, sehingga **MSW (browser) mengintersep semua permintaan**. Hindari `fetch` dari Server Component untuk data yang dimock, agar pergantian ke backend nyata tetap sederhana.

---

## 4. Variabel Lingkungan (`.env.local`)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_APP_NAME=Projek Sains Data
```

- `NEXT_PUBLIC_USE_MOCKS=true` → MSW aktif, data demo.
- `NEXT_PUBLIC_USE_MOCKS=false` → MSW mati, frontend memanggil backend nyata di `NEXT_PUBLIC_API_BASE_URL`.

---

## 5. Struktur Folder (target)

```
app/                      # rute Next.js (App Router)
  (public)/               # halaman publik (beranda, explore, detail)
  (auth)/login, register
  (app)/                  # halaman setelah login (dashboard, settings)
components/               # komponen PSD yang MENGOMPOSISI komponen tema
  layout/                 # shell, header, sidebar (dari tema)
  features/               # blok per fitur (registry, competitions, events, ...)
lib/
  api/                    # client + modul endpoint (SATU-SATUNYA pintu ke backend)
    client.ts
    repos.ts datasets.ts models.ts notebooks.ts
    learn.ts community.ts competitions.ts events.ts auth.ts
  mocks/                  # MSW: handlers + data demo
    browser.ts handlers.ts
    data/                 # data demo per resource
  query.ts                # konfigurasi TanStack Query
types/
  api.ts                  # skema Zod + tipe (sumber kebenaran kontrak di FE)
theme/                    # tema yang dibeli (JANGAN diubah isinya)
```

---

## 6. Integrasi Tema yang Dibeli

1. **Pasang tema** sesuai instruksinya (paket npm atau salin ke `theme/`). Catat di mana letak: design tokens (warna, tipografi, spacing), komponen (button, card, table, tabs, form, navbar, sidebar), dan template halaman.
2. **Petakan, jangan tiru ulang.** Buat tabel pendek "komponen tema → penggunaan di PSD" (mis. `ThemeCard` → kartu repo/kompetisi/event; `ThemeTable` → leaderboard & daftar aset; `ThemeTabs` → tab pada halaman kompetisi).
3. **Shell aplikasi** (header, sidebar, footer) diambil dari layout tema; isi menu dengan navigasi PSD (Bagian 9).
4. **Token dari tema, bukan nilai acak.** Semua warna/jenis huruf/spacing memakai token tema. Jangan menulis hex atau ukuran font lepas.
5. **Jangan modifikasi internal tema.** Bila perlu menyesuaikan, bungkus dengan komponen wrapper di `components/`. Ini menjaga tema tetap bisa di-*update*.
6. Terapkan prinsip menulis UI di Bagian 2 poin 6 pada semua label & teks.

---

## 7. Lapisan Data: API Client + Mock

### 7.1 Client (`lib/api/client.ts`)

```ts
import { z } from "zod";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PREFIX = "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("psd_token");

export async function apiFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const e = body?.error ?? {};
    throw new ApiError(res.status, e.code ?? "unknown", e.message ?? res.statusText, e.details);
  }
  return schema.parse(await res.json());
}
```

> **Catatan keamanan:** menyimpan token di `localStorage` cukup untuk demo Fase 0. Saat backend nyata + SSO (Keycloak) aktif, pindahkan ke cookie `httpOnly`. Pisahkan logika token agar mudah diganti.

### 7.2 Modul endpoint (contoh `lib/api/competitions.ts`)

```ts
import { apiFetch } from "./client";
import {
  PaginatedCompetition, CompetitionDetailSchema, PaginatedLeaderboard,
} from "@/types/api";

export const getCompetitions = (q: { status?: "active" | "upcoming" | "past"; page?: number } = {}) =>
  apiFetch(`/competitions?${new URLSearchParams(q as Record<string, string>)}`, PaginatedCompetition);

export const getCompetition = (slug: string) =>
  apiFetch(`/competitions/${slug}`, CompetitionDetailSchema);

export const getLeaderboard = (slug: string, board: "public" | "private" = "public", page = 1) =>
  apiFetch(`/competitions/${slug}/leaderboard?board=${board}&page=${page}`, PaginatedLeaderboard);
```

### 7.3 Skema sebagai sumber tipe (contoh `types/api.ts`)

```ts
import { z } from "zod";

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), page_size: z.number() });

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable().optional(),
  role: z.enum(["user", "org_admin", "admin"]),
  created_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;
// → definisikan SEMUA entitas lain (Bagian 8) dengan pola yang sama.
```

### 7.4 Mock (contoh `lib/mocks/handlers.ts`)

```ts
import { http, HttpResponse } from "msw";
import { competitions, detailOf, leaderboardOf } from "./data/competitions";

const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000") + "/api/v1";

export const handlers = [
  http.get(`${API}/competitions`, ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    const items = status ? competitions.filter((c) => c.status === status) : competitions;
    return HttpResponse.json({ items, total: items.length, page: 1, page_size: 20 });
  }),
  http.get(`${API}/competitions/:slug`, ({ params }) => {
    const c = competitions.find((c) => c.slug === params.slug);
    return c ? HttpResponse.json(detailOf(c)) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API}/competitions/:slug/leaderboard`, ({ params }) =>
    HttpResponse.json(leaderboardOf(String(params.slug)))),
];
```

Aktifkan MSW hanya saat `NEXT_PUBLIC_USE_MOCKS === "true"`, dimulai dari sebuah Client Component provider di root layout. Buat handler untuk **setiap** endpoint di Bagian 8.

---

## 8. Kontrak API dengan Backend

Kontrak ini mengikat **frontend (mock)** dan **backend (FastAPI)**. Backend wajib mengimplementasikan bentuk yang sama persis agar pergantian mulus.

### 8.1 Konvensi

- **Base:** `{NEXT_PUBLIC_API_BASE_URL}/api/v1`
- **Auth:** header `Authorization: Bearer <token>` untuk endpoint ber-auth.
- **Paginasi:** query `page` (mulai 1) & `page_size` (default 20). Respons list selalu `{ items, total, page, page_size }`.
- **Urutan:** query `sort`, mis. `-updated_at` (turun), `downloads` (naik).
- **Pencarian/filter:** query `q`, `tags` (pisah koma), dan filter khusus per resource.
- **Waktu:** ISO 8601 UTC (mis. `2026-06-24T08:30:00Z`).
- **ID:** string. Untuk repo, identitas publik = `owner/name` (slug).
- **Error:** body `{ "error": { "code": string, "message": string, "details"?: object } }` dengan kode HTTP yang sesuai (400/401/403/404/422/500).

### 8.2 Skema Entitas (ringkas)

```ts
OwnerRef       { username: string; type: "user" | "org"; avatar_url: string | null }

RepoSummary    { id; slug;            // "owner/name"
                 kind: "project" | "dataset" | "model";
                 owner: OwnerRef; name; description;
                 tags: string[]; likes: number; downloads: number;
                 visibility: "public" | "private"; updated_at }

RepoDetail     extends RepoSummary {
                 readme_md: string; files: { path; size_bytes; type }[];
                 license: string | null; metrics?: Record<string, number> }

NotebookSummary{ id; title; owner: OwnerRef; tags: string[]; updated_at }
NotebookDetail extends NotebookSummary { description; status: "ready" | "stub" }

CourseSummary  { slug; title; level: "pemula" | "menengah" | "mahir";
                 lessons_count: number; cover_url: string | null }
CourseDetail   extends CourseSummary { description;
                 modules: { title; lessons: { id; title; duration_min }[] }[] }

LearningPathSummary { slug; title; courses_count: number; description }
LearningPathDetail  extends LearningPathSummary { course_slugs: string[] }

ThreadSummary  { id; title; author: OwnerRef; tags: string[];
                 replies: number; created_at; last_activity_at }
Post           { id; author: OwnerRef; body_md: string; created_at }
ThreadDetail   extends ThreadSummary { body_md: string; posts: Post[] }

CompetitionSummary { slug; title; sponsor: string | null;
                     status: "active" | "upcoming" | "past";
                     metric: string; participants: number;
                     prize_pool: string | null;
                     starts_at; ends_at; cover_url: string | null }
CompetitionDetail  extends CompetitionSummary {
                     overview_md; rules_md; dataset_info_md;
                     prizes: { rank; reward }[]; tags: string[] }
LeaderboardEntry   { rank: number; participant: OwnerRef; score: number; submitted_at }
Submission         { id; created_at; status: "queued" | "scored" | "failed";
                     public_score: number | null; filename: string }

EventSummary   { slug; title; type: "webinar" | "hackathon" | "bootcamp" | "meetup" | "demo_day";
                 mode: "daring" | "luring"; starts_at; ends_at;
                 location: string | null; cover_url: string | null;
                 registered: number; capacity: number | null }
EventDetail    extends EventSummary { description_md; agenda: { time; title }[];
                 speakers: { name; title; avatar_url: string | null }[] }
Registration   { registration_id: string; status: "registered" | "waitlisted" }
```

### 8.3 Daftar Endpoint

| Metode | Path | Auth | Query / Body | Respons |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ username, email, password, name }` | `{ user: User, token }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ user: User, token }` |
| GET | `/auth/me` | ✓ | — | `{ user: User }` |
| GET | `/users/{username}` | — | — | `User & { stats }` |
| GET | `/users/{username}/portfolio` | — | `page` | `Paginated<RepoSummary>` |
| GET | `/projects` `/datasets` `/models` | — | `q, tags, sort, page, page_size` | `Paginated<RepoSummary>` |
| GET | `/{kind}/{owner}/{name}` | — | — | `RepoDetail` |
| POST | `/{kind}` | ✓ | `{ name, description, visibility, tags }` | `RepoDetail` *(Fase 0: boleh mock "queued")* |
| GET | `/notebooks` | — | `q, page` | `Paginated<NotebookSummary>` |
| GET | `/notebooks/{id}` | — | — | `NotebookDetail` |
| POST | `/notebooks/{id}/launch` | ✓ | — | `{ url, status }` *(Fase 0: stub)* |
| GET | `/courses` | — | `level, page` | `Paginated<CourseSummary>` |
| GET | `/courses/{slug}` | — | — | `CourseDetail` |
| GET | `/learning-paths` | — | `page` | `Paginated<LearningPathSummary>` |
| GET | `/learning-paths/{slug}` | — | — | `LearningPathDetail` |
| GET | `/forum/threads` | — | `q, tags, sort, page` | `Paginated<ThreadSummary>` |
| GET | `/forum/threads/{id}` | — | — | `ThreadDetail` |
| POST | `/forum/threads` | ✓ | `{ title, body_md, tags }` | `ThreadDetail` |
| GET | `/competitions` | — | `status, page` | `Paginated<CompetitionSummary>` |
| GET | `/competitions/{slug}` | — | — | `CompetitionDetail` |
| GET | `/competitions/{slug}/leaderboard` | — | `board=public\|private, page` | `Paginated<LeaderboardEntry>` |
| GET | `/competitions/{slug}/submissions` | ✓ | `page` | `Paginated<Submission>` (milik pengguna) |
| POST | `/competitions/{slug}/submissions` | ✓ | `multipart: file` | `Submission` *(Fase 0: mock "queued")* |
| GET | `/events` | — | `status, type, page` | `Paginated<EventSummary>` |
| GET | `/events/{slug}` | — | — | `EventDetail` |
| POST | `/events/{slug}/register` | ✓ | — | `Registration` |

### 8.4 Contoh Payload (nuansa lokal)

```jsonc
// GET /competitions/prediksi-permintaan-umkm
{
  "slug": "prediksi-permintaan-umkm",
  "title": "Prediksi Permintaan Produk UMKM",
  "sponsor": "Dinas Koperasi & UMKM Lampung",
  "status": "active",
  "metric": "RMSLE",
  "participants": 128,
  "prize_pool": "Rp15.000.000",
  "starts_at": "2026-06-01T00:00:00Z",
  "ends_at": "2026-07-15T23:59:00Z",
  "cover_url": null,
  "overview_md": "Bangun model peramalan permintaan mingguan untuk 200 UMKM binaan...",
  "rules_md": "Satu peserta maksimal 5 submission per hari...",
  "dataset_info_md": "Data penjualan historis 18 bulan, anonim...",
  "prizes": [{ "rank": 1, "reward": "Rp8.000.000 + peluang rekrutmen" }],
  "tags": ["forecasting", "umkm", "tabular"]
}
```

```jsonc
// GET /datasets  → items[0]
{
  "id": "ds_01",
  "slug": "psd/ulasan-marketplace-id",
  "kind": "dataset",
  "owner": { "username": "psd", "type": "org", "avatar_url": null },
  "name": "ulasan-marketplace-id",
  "description": "200rb ulasan produk berbahasa Indonesia berlabel sentimen.",
  "tags": ["nlp", "sentimen", "bahasa-indonesia"],
  "likes": 42, "downloads": 1310, "visibility": "public",
  "updated_at": "2026-06-20T10:00:00Z"
}
```

---

## 9. Halaman yang Dibangun (Fase 0)

Prioritas: **P0** = wajib untuk demo; **P1** = penting; **P2** = boleh *stub*. Setiap halaman: pakai komponen tema, ambil data via `lib/api/*`, sediakan state loading/kosong/error.

| Rute | Halaman | Endpoint utama | Prioritas |
|---|---|---|---|
| `/` | Beranda: hero tema + sorot proyek, kompetisi, event unggulan | `/projects`, `/competitions?status=active`, `/events` | P0 |
| `/login`, `/register` | Autentikasi | `/auth/login`, `/auth/register` | P0 |
| `/explore` (atau `/projects`, `/datasets`, `/models`) | Daftar aset + cari/filter/urut | `/{kind}` | P0 |
| `/[kind]/[owner]/[name]` | Detail aset: README, file, metadata | `/{kind}/{owner}/{name}` | P0 |
| `/competitions` | Daftar kompetisi (tab: aktif/akan datang/selesai) | `/competitions?status=` | P0 |
| `/competitions/[slug]` | Detail kompetisi — tab: Ikhtisar / Data / Leaderboard / Submission | `/competitions/{slug}`, `/leaderboard`, `/submissions` | P0 |
| `/events` | Daftar event | `/events` | P0 |
| `/events/[slug]` | Detail event + tombol "Daftar" | `/events/{slug}`, `/register` | P0 |
| `/dashboard` | Ringkasan setelah login | `/auth/me` | P1 |
| `/learn` + `/learn/[slug]` | Course & detail | `/courses`, `/courses/{slug}` | P1 |
| `/paths` + `/paths/[slug]` | Learning path | `/learning-paths` | P1 |
| `/community` + `/community/[id]` | Forum & utas | `/forum/threads`, `/forum/threads/{id}` | P1 |
| `/u/[username]` | Profil & portofolio | `/users/{username}` | P1 |
| `/notebooks` + `/notebooks/[id]` | Daftar notebook + detail (launch = stub) | `/notebooks` | P2 |
| `/settings` | Pengaturan akun | `/auth/me` | P2 |

Navigasi utama (sidebar/header tema): Beranda · Explore · Kompetisi · Event · Belajar · Komunitas · (Profil/Login).

---

## 10. Data Demo (Mock)

- Buat data demo **realistis & berkonteks Indonesia**: dataset ulasan marketplace, model IndoBERT-sentimen, kompetisi prediksi permintaan UMKM, event "Demo Day Sains Data ITERA", course "Pengantar Analisis Big Data".
- Cukup volume untuk menguji UI: ~8–12 item per daftar, 1–2 detail lengkap per resource, leaderboard ~20 baris.
- Simpan per resource di `lib/mocks/data/*`. Patuhi skema Bagian 8 **persis** (validasi balik dengan Zod yang sama).

---

## 11. Flip Mock → Backend Nyata

1. Set `NEXT_PUBLIC_USE_MOCKS=false` dan arahkan `NEXT_PUBLIC_API_BASE_URL` ke backend.
2. MSW tidak diaktifkan; `apiFetch` memanggil backend nyata. **Kode komponen & `lib/api/*` tidak berubah.**
3. Backend FastAPI mengimplementasikan kontrak Bagian 8 (path, bentuk respons, error, paginasi sama).
4. Karena respons divalidasi Zod, ketidakcocokan kontrak langsung terdeteksi saat dev.

---

## 12. Definition of Done — Fase 0

- [ ] Tema terpasang; shell (header/sidebar/footer) memakai komponen tema; navigasi PSD lengkap.
- [ ] Semua halaman **P0** jadi & bisa dijelajahi end-to-end dengan data mock.
- [ ] Tidak ada `fetch`/`axios` langsung di komponen; semua lewat `lib/api/*` + TanStack Query.
- [ ] Skema Zod ada untuk setiap entitas; respons divalidasi.
- [ ] Handler MSW tersedia untuk **setiap** endpoint di Bagian 8.
- [ ] Setiap layar punya state loading, kosong, dan error yang jelas (copy Indonesia, kalimat aktif).
- [ ] Responsif sampai mobile; focus keyboard terlihat; `prefers-reduced-motion` dihormati.
- [ ] Mengubah `NEXT_PUBLIC_USE_MOCKS=false` membuat app mencoba backend nyata tanpa perubahan kode lain.
- [ ] `npm run build` dan `npm run lint` lulus tanpa error.

---

*Dokumen ini akan berkembang. Bila backend menambah/mengubah endpoint, perbarui Bagian 8 lebih dulu, lalu sesuaikan mock dan tipe.*
