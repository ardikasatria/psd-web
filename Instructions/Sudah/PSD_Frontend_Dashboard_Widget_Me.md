# PSD — Instruksi Cursor: Widget Dashboard "Submission saya" & "Event saya"

> **Cara pakai:** Lampirkan ke Cursor bersama dokumen frontend & dashboard. File ini menambah dua widget ke `/dashboard` memakai endpoint baru `/me/submissions` dan `/me/events` (backend Langkah 10). **Kerjakan hanya langkah ini.** Prasyarat: backend Langkah 10 selesai dan kontrak Bagian 8 sudah diperbarui.

## 1. Tujuan

Mempromosikan dua widget yang sebelumnya ditandai opsional (Bagian 7 instruksi dashboard) menjadi nyata: **"Submission saya"** (lintas kompetisi) dan **"Event saya"** (registrasi). Pola sama dengan widget dashboard lain: data via `lib/api/*` + TanStack Query, state loading/kosong/error, komponen tema.

## 2. Skema Zod — tambahkan di `types/api.ts`

```ts
export const MySubmissionSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.enum(["queued", "scored", "failed"]),
  public_score: z.number().nullable(),
  filename: z.string(),
  competition: z.object({ slug: z.string(), title: z.string() }),
});
export const PaginatedMySubmission = Paginated(MySubmissionSchema);

export const MyEventRegistrationSchema = z.object({
  registration_id: z.string(),
  status: z.enum(["registered", "waitlisted"]),
  event: z.object({
    slug: z.string(),
    title: z.string(),
    type: z.string(),
    mode: z.enum(["daring", "luring"]),
    starts_at: z.string(),
    ends_at: z.string(),
    location: z.string().nullable(),
    cover_url: z.string().nullable(),
  }),
});
export const PaginatedMyEvent = Paginated(MyEventRegistrationSchema);
```

## 3. Fungsi API — `lib/api/me.ts`

```ts
import { apiFetch } from "./client";
import { PaginatedMySubmission, PaginatedMyEvent } from "@/types/api";

export const getMySubmissions = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/submissions?${new URLSearchParams(q as Record<string, string>)}`, PaginatedMySubmission);

export const getMyEvents = (q: { page?: number; page_size?: number } = {}) =>
  apiFetch(`/me/events?${new URLSearchParams(q as Record<string, string>)}`, PaginatedMyEvent);
```

## 4. Handler MSW — tambahkan di `lib/mocks/handlers.ts`

Agar mode mock (`NEXT_PUBLIC_USE_MOCKS=true`) tetap bekerja. Samakan slug dengan data seed (`prediksi-permintaan-umkm`, `demo-day-sains-data-itera`).

```ts
http.get(`${API}/me/submissions`, () =>
  HttpResponse.json({
    items: [{
      id: "sub_1", created_at: "2026-06-22T09:00:00Z", status: "scored",
      public_score: 0.412, filename: "submission.csv",
      competition: { slug: "prediksi-permintaan-umkm", title: "Prediksi Permintaan Produk UMKM" },
    }],
    total: 1, page: 1, page_size: 20,
  })),

http.get(`${API}/me/events`, () =>
  HttpResponse.json({
    items: [{
      registration_id: "reg_1", status: "registered",
      event: {
        slug: "demo-day-sains-data-itera", title: "Demo Day Sains Data ITERA",
        type: "demo_day", mode: "luring",
        starts_at: "2026-07-10T02:00:00Z", ends_at: "2026-07-10T08:00:00Z",
        location: "ITERA, Lampung Selatan", cover_url: null,
      },
    }],
    total: 1, page: 1, page_size: 20,
  })),
```

## 5. Hook — tambahkan di `lib/api/dashboard.ts`

```ts
import { getMySubmissions, getMyEvents } from "./me";

export const useMySubmissions = () =>
  useQuery({ queryKey: ["dash", "my-subs"], queryFn: () => getMySubmissions({ page_size: 4 }) });

export const useMyEvents = () =>
  useQuery({ queryKey: ["dash", "my-events"], queryFn: () => getMyEvents({ page_size: 4 }) });
```

## 6. Widget di Dashboard — `app/(app)/dashboard/page.tsx`

Panggil hook baru:

```tsx
const mySubs = useMySubmissions();
const myEvents = useMyEvents();
```

Tambahkan dua `Section` ke grid — letakkan **"Submission saya" dekat "Kompetisi aktif"** dan **"Event saya" dekat "Event mendatang"**:

```tsx
<Section title="Submission saya" href="/competitions" query={mySubs}
  empty={<EmptyCTA text="Belum ada submission. Ikuti kompetisi pertama." href="/competitions" cta="Ikuti kompetisi" />}>
  {(items) => items.map((s: any) => <SubmissionRow key={s.id} s={s} />)}
</Section>

<Section title="Event saya" href="/events" query={myEvents}
  empty={<EmptyCTA text="Anda belum terdaftar di event mana pun." href="/events" cta="Jelajahi event" />}>
  {(items) => items.map((r: any) => <MyEventRow key={r.registration_id} r={r} />)}
</Section>
```

Buat dua baris dari komponen tema:

```tsx
// Submission: judul kompetisi + badge status + skor publik
function SubmissionRow({ s }: { s: any }) {
  return (
    <ThemeListItem
      title={s.competition.title}
      meta={`${s.filename} · ${new Date(s.created_at).toLocaleDateString("id-ID")}`}
      right={<ThemeBadge status={s.status}>{labelStatus(s.status)}</ThemeBadge>}
      value={s.public_score ?? "—"}
      href={`/competitions/${s.competition.slug}`}
    />
  );
}

// Event: judul + tanggal mulai + badge status registrasi
function MyEventRow({ r }: { r: any }) {
  return (
    <ThemeListItem
      title={r.event.title}
      meta={`${labelMode(r.event.mode)} · ${new Date(r.event.starts_at).toLocaleDateString("id-ID")}`}
      right={<ThemeBadge status={r.status}>{r.status === "registered" ? "Terdaftar" : "Daftar tunggu"}</ThemeBadge>}
      href={`/events/${r.event.slug}`}
    />
  );
}
```

`labelStatus` (`queued`→"Antre", `scored`→"Dinilai", `failed`→"Gagal") dan `labelMode` (`daring`/`luring`) untuk copy Indonesia. Ganti `<ThemeListItem>`, `<ThemeBadge>` dengan komponen tema asli; gunakan kembali baris daftar yang sudah dipakai di halaman list agar konsisten.

## 7. Definition of Done

- [ ] `types/api.ts` punya `MySubmissionSchema` & `MyEventRegistrationSchema` (+ paginated).
- [ ] `lib/api/me.ts` menyediakan `getMySubmissions` & `getMyEvents`.
- [ ] Handler MSW ada untuk kedua endpoint (mode mock tetap jalan).
- [ ] Dua widget tampil di `/dashboard` dengan state loading/kosong/error.
- [ ] Empty state mengajak bertindak (Ikuti kompetisi / Jelajahi event), bukan sekadar kosong.
- [ ] Status ditampilkan dalam bahasa Indonesia; tanggal diformat `id-ID`.
- [ ] Saat `NEXT_PUBLIC_USE_MOCKS=false`, widget menarik data nyata dari `/me/*` tanpa perubahan kode komponen.
