# PSD — Instruksi Cursor: Event — Pendaftaran, Daftar Tunggu, Kalender & Peserta

> **Cara pakai:** Lampirkan bersama dokumen frontend. Mematangkan halaman event: daftar/batal dengan daftar tunggu, ekspor kalender, dan panel peserta admin. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 21.

## 1. Skema & API

`EventDetailSchema` **+** `registered: z.number()`, `spots_left: z.number().nullable()`, `my_registration: z.object({ status: z.enum(["registered","waitlisted"]) }).nullable()`.

```ts
// lib/api/events.ts
export const registerEvent = (slug: string) =>
  apiFetch(`/events/${slug}/register`, z.object({ registration_id: z.string(), status: z.string() }), { method: "POST" });
export const cancelEvent = (slug: string) =>
  apiFetch(`/events/${slug}/register`, z.any(), { method: "DELETE" });
export const eventIcsUrl = (slug: string) => `${BASE}/api/v1/events/${slug}/calendar.ics`;
// admin
export const getEventRegistrations = (slug: string, page = 1) =>
  apiFetch(`/admin/events/${slug}/registrations?page=${page}`, PaginatedRegistration);
export const checkInRegistration = (slug: string, id: string, attended: boolean) =>
  apiFetch(`/admin/events/${slug}/registrations/${id}`, z.any(), { method: "PATCH", body: JSON.stringify({ attended }) });
```

## 2. Halaman detail event — `/events/[slug]`

- **Kapasitas:** tampilkan `registered` dan, bila `spots_left !== null`, sisa kursi (atau "Kuota penuh — daftar tunggu tersedia").
- **Tombol aksi** berdasar `my_registration`:
  - `null` → **"Daftar"** → `registerEvent` → invalidate detail. Jika hasil `waitlisted`, tampilkan info "Anda masuk daftar tunggu".
  - `registered` → label "Terdaftar" + tombol **"Batalkan"** → `cancelEvent`.
  - `waitlisted` → label "Daftar tunggu" + tombol **"Keluar dari daftar tunggu"**.
- **Tambah ke kalender:** tombol unduh menuju `eventIcsUrl(slug)` (browser mengunduh `.ics`; buka di Google/Apple Calendar). Tampilkan untuk semua, tak perlu login.
- Bila `status === "past"`, sembunyikan tombol daftar; tampilkan "Telah berakhir".

## 3. "Event saya" (dashboard)

Widget dari Langkah 10 sudah ada — tambahkan tombol **Batalkan** per item (panggil `cancelEvent`, lalu invalidate `["dash","my-events"]`). Tampilkan badge status (Terdaftar / Daftar tunggu).

## 4. Admin: panel peserta

Pada halaman edit event admin, tab/halaman **Peserta**:
- Tabel dari `getEventRegistrations(slug)`: nama, username, status (terdaftar/daftar tunggu), kehadiran.
- **Check-in:** switch "Hadir" per baris → `checkInRegistration(slug, id, attended)` → invalidate.
- Ringkasan: jumlah terdaftar, daftar tunggu, hadir.
- (Opsional) tombol **Ekspor CSV** peserta — hasilkan di sisi klien dari data tabel (nama, username, status, hadir).

## 5. Handler MSW

Tambah handler register (variasi `registered`/`waitlisted`), cancel, detail dengan `my_registration`/`spots_left`, registrasi admin, dan check-in. Untuk `.ics`, MSW boleh dilewati (unduhan langsung dari backend nyata; di mode mock, sediakan handler yang mengembalikan teks ICS sederhana bila perlu).

## 6. Definition of Done

- [ ] Daftar/batal berfungsi; UI mencerminkan `registered`/`waitlisted`/penuh dengan benar.
- [ ] Sisa kursi & status saya akurat; event `past` menyembunyikan pendaftaran.
- [ ] Tombol "Tambah ke kalender" mengunduh `.ics` yang valid.
- [ ] "Event saya" bisa membatalkan langsung dari dashboard.
- [ ] Admin: lihat peserta, check-in kehadiran, ringkasan jumlah; (opsional) ekspor CSV.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
