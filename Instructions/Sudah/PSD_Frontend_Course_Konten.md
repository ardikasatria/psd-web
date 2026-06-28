# PSD — Instruksi Cursor: Struktur & Isi Course (Builder + Pemutar)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Course builder (instruktur) + tampilan isi & quiz (pembelajar). **Kerjakan setelah backend Langkah 31.**

## 1. Skema & API

`CourseDetailSchema` **+** `requirements_md: z.string().nullable()`, `total_duration_min: z.number()`. Lesson schema:

```ts
export const LessonSchema = z.object({
  id: z.string(), title: z.string(), type: z.enum(["reading","video","quiz"]),
  duration_min: z.number().optional(),
  content_md: z.string().nullable().optional(), video_url: z.string().nullable().optional(),
  materials: z.array(z.object({ name: z.string(), url: z.string(), size_bytes: z.number(), type: z.string() })).optional(),
  quiz: z.array(z.object({ id: z.string(), question: z.string(), options: z.array(z.string()),
    answer_index: z.number().optional(), explanation: z.string().optional() })).optional(),
});
```

```ts
// lib/api/learn.ts
export const uploadMaterial = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/courses/${slug}/materials`, { method: "POST", body: fd, credentials: "include" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); });
};
export const submitQuiz = (slug: string, lessonId: string, answers: number[]) =>
  apiFetch(`/courses/${slug}/lessons/${lessonId}/quiz/submit`, QuizResultSchema, { method: "POST", body: JSON.stringify({ answers }) });
// updateCourse(slug, { modules, requirements_md, description, ... }) sudah ada (kirim modules yang diperbarui)
```

## 2. Course Builder (Studio instruktur)

Editor berbasis `modules` (topik) → `lessons`:

- **Topik (modul):** tambah, ubah judul, urutkan, hapus.
- **Lesson:** tambah/urut/hapus; pilih **tipe** (Bacaan/Video/Quiz):
  - *Bacaan:* editor markdown (`content_md`) + durasi.
  - *Video:* `video_url` + durasi.
  - *Quiz:* editor pertanyaan — tiap pertanyaan: teks, beberapa opsi, tandai **kunci** (`answer_index`), dan `explanation` opsional.
- **Materi:** tombol unggah (`uploadMaterial`) → tambahkan objek hasil ke `materials` lesson; tampilkan daftar + hapus.
- Simpan keseluruhan via `updateCourse(slug, { modules })`.

**Metadata course:** form deskripsi, **syarat** (`requirements_md`, markdown), level. Tampilkan **durasi total** (otomatis dari `total_duration_min`).

> Builder mengedit struktur `modules` lalu mengirim utuh lewat `updateCourse`. Pastikan tiap lesson punya `id` unik (generate bila baru).

## 3. Halaman course (pembelajar)

- **Ringkasan:** deskripsi, **Syarat** (render `requirements_md`), **Durasi total** (format jam/menit), jumlah lesson, daftar topik→lesson dengan ikon tipe.
- **Pemutar lesson** (`/learn/[slug]/[lessonId]`):
  - *Bacaan:* render `content_md`. *Video:* sematkan `video_url`.
  - **Materi:** daftar unduhan (nama + ukuran + tautan).
  - *Quiz:* tampilkan pertanyaan + opsi (kunci tak ada di data). Submit → `submitQuiz` → tampilkan **skor**, lulus/belum, dan **review** (kunci benar + penjelasan) setelah submit. Lulus menandai lesson selesai.

## 4. Handler MSW

Tambah handler unggah materi & submit quiz (kembalikan skor + review); course detail dengan lesson bertipe campuran (sertakan quiz tanpa kunci untuk pembelajar, dengan kunci untuk builder/staf).

## 5. Definition of Done

- [ ] Builder mengelola topik, lesson (3 tipe), materi (unggah), dan quiz (dengan kunci) lalu menyimpan.
- [ ] Pembelajar melihat deskripsi, syarat, durasi total, dan struktur; pemutar merender bacaan/video/materi.
- [ ] Quiz: pembelajar tak melihat kunci sebelum submit; setelah submit melihat skor + review; lulus menandai selesai.
- [ ] Durasi total otomatis; id lesson unik terjaga.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
