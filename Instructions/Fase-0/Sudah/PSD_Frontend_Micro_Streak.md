# PSD — Instruksi Cursor: Micro-learning & Streak (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Widget belajar harian, streak lembut, pemutar micro-lesson. **Kerjakan setelah backend Langkah 36.**

## 1. Skema & API

```ts
export const StreakSchema = z.object({ current_streak: z.number(), longest_streak: z.number(),
  active_today: z.boolean(), weekly_done: z.number(), weekly_goal: z.number(),
  calendar: z.array(z.object({ date: z.string(), active: z.boolean() })) });

// lib/api/micro.ts
export const getDailyMicro = () => apiFetch(`/micro/daily`, z.object({ items: z.array(z.object({ slug: z.string(), title: z.string(), duration_min: z.number(), has_quiz: z.boolean() })) }));
export const getMicro = (slug: string) => apiFetch(`/micro/${slug}`, MicroSchema);
export const completeMicro = (slug: string, answers?: number[]) => apiFetch(`/micro/${slug}/complete`, MicroResultSchema, { method: "POST", body: JSON.stringify({ answers }) });
export const getStreak = () => apiFetch(`/me/streak`, StreakSchema);
```

## 2. Widget "Belajar hari ini" (dashboard)

Komponen menonjol di dashboard:
- **Streak (lembut):** tampilkan 🔥 `current_streak` hari, tetapi **utamakan target mingguan** — bar "Belajar {weekly_done}/{weekly_goal} hari minggu ini". Hindari bahasa menakut-nakuti ("streak-mu akan hilang!"); pakai dorongan positif ("Satu micro-lesson lagi untuk hari ini").
- **Daftar micro hari ini:** kartu dari `getDailyMicro()` (judul, durasi ~5 mnt, tanda quiz). Klik → pemutar.

## 3. Pemutar micro-lesson — `/micro/[slug]`

- Render `content_md` (singkat). Bila ada quiz: tampilkan pertanyaan (tanpa kunci) → submit via `completeMicro(slug, answers)` → skor + review (kunci) muncul setelah submit.
- Tanpa quiz: tombol "Selesai" → `completeMicro(slug)`.
- Setelah selesai: animasi ringan (hormati `reduced_motion`), invalidate `["me","streak"]` & daily; tawarkan micro berikutnya.

## 4. Halaman/keping Streak

- **Kalender 30 hari** (heatmap sederhana) dari `calendar` (hari aktif disorot).
- Tampilkan `current_streak`, `longest_streak`, dan progres mingguan.
- Nada copy: merayakan konsistensi, bukan menghukum kelewatan.

## 5. Admin: kurasi micro-lesson (staf)

Halaman `/admin/micro`: tabel + editor (judul, slug, konten markdown singkat, durasi, kategori, quiz singkat opsional). Tambah ke nav admin.

## 6. Handler MSW

Tambah handler `/micro/daily`, `/micro/{slug}`, complete (dengan/atau tanpa quiz), `/me/streak` (variasi streak & kalender), admin micro.

## 7. Definition of Done

- [ ] Widget belajar harian + streak tampil di dashboard; menekankan target mingguan, bukan ancaman.
- [ ] Pemutar micro merender konten & quiz singkat; selesai memperbarui streak.
- [ ] Kalender 30 hari & angka streak benar; nada copy positif.
- [ ] Staf dapat mengkurasi micro-lesson.
- [ ] `reduced_motion` dihormati; mode mock berfungsi.
