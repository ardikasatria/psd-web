# PSD — Instruksi Cursor: Publish Course Dua Pihak (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Alur ajukan→tinjau→terbit + kredit kolaborasi. **Kerjakan setelah backend Langkah 30 & Notifikasi (Langkah 29).**

## 1. Skema & API

`CourseDetailSchema` **+** `author` (OwnerRef|null), `publisher` (OwnerRef|null), `status: z.enum(["draft","pending_review","published","rejected"])`, `review_note: z.string().nullable()`.

```ts
// lib/api/learn.ts
export const submitCourseReview = (slug: string) => apiFetch(`/courses/${slug}/submit-review`, z.any(), { method: "POST" });
export const getReviewQueue = (page = 1) => apiFetch(`/admin/courses/review-queue?page=${page}`, PaginatedCourseReview);
export const reviewCourse = (slug: string, decision: "publish" | "reject", note?: string) =>
  apiFetch(`/admin/courses/${slug}/review`, z.any(), { method: "PATCH", body: JSON.stringify({ decision, note }) });
```

## 2. Studio instruktur (ubah Langkah 20)

- Tombol publish lama **diganti** "Ajukan untuk ditinjau" (`submitCourseReview`) — aktif hanya saat `draft`/`rejected`.
- **Badge status** per course: Draft / Menunggu tinjauan / Diterbitkan / Ditolak.
- Bila `rejected`: tampilkan **`review_note`** dari humas (alasan revisi) + tombol ajukan ulang.
- Saat `pending_review`: editor dikunci (read-only) dengan info "Sedang ditinjau".

## 3. Antrean tinjauan humas — `/admin/courses/review` (staf)

- Daftar course `pending_review` (`getReviewQueue`): judul, penulis, level. Klik → pratinjau course.
- Aksi: **Terbitkan** (`reviewCourse(slug,"publish")`) atau **Tolak** dengan **catatan revisi** (`reviewCourse(slug,"reject",note)`). Konfirmasi + invalidate antrean.
- Tambahkan "Tinjauan Course" ke nav admin (staf). Tampilkan jumlah antrean (opsional, dari panjang daftar).

## 4. Kolaborasi di halaman course

Pada `/learn/[slug]`, bagian **Kolaborasi**:
> Dibuat oleh **{author}** (instruktur) · Diterbitkan oleh **{publisher}** (badge Resmi PSD)

Tampilkan avatar keduanya. Ini menegaskan kredit instruktur sekaligus penerbitan resmi PSD.

## 5. Notifikasi (sudah dari Langkah 29)

- Instruktur menerima notifikasi "Course diterbitkan/perlu revisi" → klik menuju `/learn/{slug}` atau `/studio`.
- Humas menerima "Course menunggu review" → klik menuju `/admin/courses/review`.
(Tidak perlu kode tambahan; cukup pastikan `link` notifikasi mengarah benar.)

## 6. Handler MSW

Tambah handler submit-review, review-queue, review (publish/reject); course detail dengan `author`/`publisher`/`status`/`review_note` bervariasi.

## 7. Definition of Done

- [ ] Instruktur mengajukan (bukan publish); melihat status & catatan revisi; ajukan ulang setelah ditolak.
- [ ] Editor terkunci saat `pending_review`.
- [ ] Humas: antrean tinjauan, terbitkan/tolak dengan catatan.
- [ ] Halaman course menampilkan kolaborasi (instruktur + penerbit PSD).
- [ ] Notifikasi mengarah ke halaman yang tepat di kedua sisi.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
