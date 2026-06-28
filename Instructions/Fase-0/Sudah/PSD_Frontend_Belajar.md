# PSD — Instruksi Cursor: Belajar (Katalog, Lesson, Enrol, Progres, Instruktur)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Mematangkan Belajar jadi LMS: katalog, pemutar lesson, enrol & progres, pendaftaran instruktur, dan studio penulis course. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 20.

## 1. Skema & API

`CourseDetailSchema` **+** `author` (OwnerRef opsional), `status`, `enrolled: z.boolean().default(false)`; `lesson` **+** `content_md`, `video_url`. Tambah `LearningProgressSchema` & `InstructorApplicationSchema`.

```ts
// lib/api/learn.ts
export const enrollCourse = (slug: string) => apiFetch(`/courses/${slug}/enroll`, z.any(), { method: "POST" });
export const completeLesson = (slug: string, lessonId: string) =>
  apiFetch(`/courses/${slug}/lessons/${lessonId}/complete`, z.any(), { method: "POST" });
export const getMyLearning = () => apiFetch(`/me/learning`, MyLearningSchema);
export const getAuthoredCourses = () => apiFetch(`/me/courses/authored`, z.array(CourseSummarySchema));
export const createCourse = (b: any) => apiFetch(`/courses`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const updateCourse = (slug: string, b: any) => apiFetch(`/courses/${slug}`, z.object({ slug: z.string() }), { method: "PATCH", body: JSON.stringify(b) });

// lib/api/instructors.ts
export const applyInstructor = (b: { expertise: string; motivation_md: string }) =>
  apiFetch(`/me/instructor-application`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const getMyInstructorApplication = () => apiFetch(`/me/instructor-application`, InstructorApplicationSchema.nullable());
```

## 2. Katalog & detail course (publik)

- `/learn`: daftar course **published** (kartu: judul, level, jumlah lesson, instruktur). Filter level.
- `/learn/[slug]`: ikhtisar, daftar modul→lesson, info instruktur. Tombol **Enrol** (bila login & belum enrol) → `enrollCourse` → `invalidateQueries`. Bila sudah enrol, tampilkan progres & tombol "Lanjutkan".

## 3. Pemutar lesson — `/learn/[slug]/[lessonId]`

- Hanya untuk yang sudah enrol (jika belum → ajak enrol).
- Sidebar daftar lesson dengan tanda selesai; konten utama render `content_md` (markdown) + video bila `video_url`.
- Tombol **"Tandai selesai"** → `completeLesson` → perbarui progres; arahkan ke lesson berikutnya.

## 4. "Lanjutkan belajar" (dashboard) — jadikan nyata

Ganti widget rekomendasi (instruksi dashboard, Bagian 7 yang sebelumnya tertunda) dengan data `getMyLearning()`:
- Tampilkan course yang di-enrol dengan **bar progres** & tombol "Lanjutkan" → buka `next_lesson_id`.
- Bila belum enrol apa pun → empty state "Mulai belajar" mengarah ke `/learn`.

## 5. Ajakan & pendaftaran instruktur

- **Ajakan:** banner/CTA "Jadi instruktur di PSD — bagikan ilmumu" di `/learn` dan/atau profil, **hanya** bila pengguna belum instruktur & belum mengajukan (`getMyInstructorApplication`).
- **Form `/instructor/apply`:** bidang keahlian (`expertise`) + motivasi (`motivation_md`, editor markdown) → `applyInstructor`. Setelah kirim, tampilkan status "Menunggu persetujuan".
- Bila pengajuan `pending`/`rejected`/`approved`, tampilkan status terkait (bukan form lagi).

## 6. Studio Instruktur — `/studio` (role instruktur)

Guard: tampil bila `me.is_instructor || me.role === "admin"`.
- **Daftar course saya:** `getAuthoredCourses()` (termasuk draft, badge status).
- **Course builder:** form judul/level/deskripsi/cover + editor **modul & lesson** (tambah/urut/hapus modul; tiap lesson: judul, durasi, `content_md`, `video_url`). Simpan via `createCourse`/`updateCourse`.
- **Terbitkan:** toggle `status` draft↔published (PATCH `{ status: "published" }`). Konfirmasi sebelum publish.

## 7. Admin: tinjau pengajuan instruktur

Halaman `/admin/instructors`: tabel pengajuan (pemohon, keahlian, motivasi, status) + tombol **Setujui**/**Tolak** → `PATCH /admin/instructor-applications/{id}`. Tambah ke nav admin. (Manajemen course admin sudah ada; kini menampilkan status/penulis.)

## 8. Handler MSW

Tambah handler untuk semua endpoint baru: course published vs draft, enroll, complete, `/me/learning` (variasi progres), pengajuan instruktur (pending/approved), authored courses, dan admin applications.

## 9. Definition of Done

- [ ] Katalog hanya menampilkan course published; detail menampilkan modul/lesson & instruktur.
- [ ] Enrol & "Tandai selesai" memperbarui progres; pemutar lesson merender konten + video.
- [ ] "Lanjutkan belajar" di dashboard nyata (progres + lanjut ke lesson berikutnya).
- [ ] Ajakan + form pendaftaran instruktur berfungsi dengan status; setelah disetujui admin, pengguna bisa membuka Studio.
- [ ] Studio: buat/edit course dengan editor modul-lesson, dan terbitkan.
- [ ] Admin dapat menyetujui/menolak pengajuan instruktur.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
