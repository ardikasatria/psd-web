# PSD — Instruksi Cursor: Akses, Statistik & Pembelajar Course

> **Cara pakai:** Lampirkan bersama dokumen frontend. Pengaturan akses, statistik menarik di halaman course, pratinjau terkunci, dan panel pembelajar. **Kerjakan setelah backend Langkah 32.**

## 1. Skema & API

`CourseDetailSchema` **+** `access_type: z.enum(["lifetime","limited"])`, `access_days: z.number().nullable()`, `access_status: z.enum(["none","active","expired"])`, `stats: z.object({ enrolled: z.number(), completed: z.number(), lessons: z.number(), completion_rate: z.number() })`. Lesson **+** `locked: z.boolean().optional()`.

```ts
export const getLearners = (slug: string, page = 1) => apiFetch(`/courses/${slug}/learners?page=${page}`, PaginatedLearner);
// enroll(slug) sudah ada → respons kini punya expires_at
```

## 2. Pengaturan akses (Studio builder)

Di form course: pilihan **Akses** — *Selamanya (lifetime)* atau *Terbatas* + input **jumlah hari** (`access_days`) bila terbatas. Simpan via `updateCourse(slug, { access_type, access_days })`.

## 3. Statistik di halaman course (untuk menarik)

Tampilkan menonjol dari `stats`:
- **{enrolled} pembelajar terdaftar**
- **{lessons} lesson · {total_duration_min→jam/menit}**
- **Tingkat penyelesaian {completion_rate}%** ({completed} selesai)

Letakkan dekat tombol Enrol sebagai social proof.

## 4. Akses & pratinjau terkunci

- **Belum enrol (`access_status="none"`):** lesson tampil **terkunci** (`locked`) — judul/tipe/durasi terlihat, isi tidak. Tampilkan CTA **Enrol** (tampilkan masa akses: "Akses selamanya" atau "Akses {access_days} hari").
- **Aktif:** isi lesson terbuka (pemutar Langkah 31).
- **Kedaluwarsa (`access_status="expired"`):** banner "Akses Anda berakhir" + tombol **Perpanjang/Enrol ulang** (`enroll` lagi).

## 5. `/me/learning` (dashboard)

Tampilkan badge masa akses: "Akses sampai {tanggal}" atau "Selamanya"; bila `expired` → tandai & tawarkan enrol ulang.

## 6. Panel Pembelajar (instruktur/staf) — `/studio/courses/[slug]/learners`

Tabel dari `getLearners(slug)`: nama pembelajar, **bar progres** (`percent`), tanggal enrol, masa berlaku. Ringkasan jumlah pembelajar & rata-rata progres. (Opsional) ekspor CSV sisi klien.

## 7. Handler MSW

Tambah handler `/courses/{slug}/learners`; course detail dengan `stats`, `access_*`, dan lesson `locked` untuk non-enrollee vs terbuka untuk enrollee.

## 8. Definition of Done

- [ ] Builder mengatur akses lifetime/terbatas (+ hari).
- [ ] Halaman course menampilkan statistik menarik (terdaftar, lesson, durasi, tingkat penyelesaian).
- [ ] Non-enrollee melihat pratinjau terkunci + CTA enrol dengan info masa akses; kedaluwarsa → enrol ulang.
- [ ] `/me/learning` menampilkan masa akses & status kedaluwarsa.
- [ ] Instruktur/staf melihat daftar pembelajar + progres.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
