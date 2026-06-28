# PSD — Instruksi Cursor: Ruang Ide — Ramu Masalah & Hasilkan Data

> **Cara pakai:** Lampirkan bersama dokumen frontend. Panel master untuk meramu masalah (AI), meninjau/menyunting, lalu menghasilkan data. **Kerjakan setelah backend Langkah 40 & Ruang Ide Inti (Langkah 39).**

## 1. Skema & API

`RoomSchema` **+** `data_mode: z.string().nullable()`, `dataset_repo_slug: z.string().nullable()`, `generation_error: z.string().nullable()`.

```ts
export const RoomProblemSchema = z.object({ statement_md: z.string(), suggested_metric: z.string().nullable(),
  data_kind: z.enum(["structured","unstructured"]), data_spec: z.any().nullable(),
  unstructured_guidance_md: z.string().nullable(), generated_by: z.string() });

// lib/api/rooms.ts
export const frameProblem = (slug: string) => apiFetch(`/idea-rooms/${slug}/frame-problem`, RoomProblemSchema, { method: "POST" });
export const getProblem = (slug: string) => apiFetch(`/idea-rooms/${slug}/problem`, RoomProblemSchema);
export const editProblem = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/problem`, RoomProblemSchema, { method: "PATCH", body: JSON.stringify(b) });
export const generateData = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/generate-data`, z.any(), { method: "POST", body: JSON.stringify(b) });
```

## 2. Panel master — saat status `closed`

Dua tahap berurutan (hanya master):

**Tahap A — Ramu masalah (AI):**
- Tombol **Ramu masalah dengan AI** (`frameProblem`). Tampilkan info kuota AI; bila `429`, ajak naik tier.
- Setelah selesai, tampilkan hasil: **pernyataan masalah** (markdown), **metrik usulan**, dan:
  - `structured` → **tabel spec data** (kolom: nama, dtype, params) yang **bisa disunting**.
  - `unstructured` → **panduan pengumpulan** (markdown) yang bisa disunting.
- Tombol **Simpan suntingan** (`editProblem`) sebelum lanjut. (Penekanan: master meninjau sebelum generasi.)

**Tahap B — Hasilkan data:**
- Pilih **mode data**:
  - **Sintesis** (structured): input `n_rows` → `generateData({ data_mode:"synthetic", n_rows })`.
  - **Data sekunder**: pilih dataset sumber (slug) → `generateData({ data_mode:"secondary", secondary_dataset_slug })`.
  - **Kumpulkan** (otomatis bila `unstructured`): `generateData({ data_mode:"collect" })` — tim akan mengunggah data sendiri (Langkah 41) berpandu rekomendasi AI.

## 3. Status generasi

- Setelah `generateData` sintesis → status ruang `generating`. **Polling** `getRoom(slug)` tiap ~3 dtk; tampilkan "Membuat data…".
- Selesai → status `solving`, tampilkan tautan **dataset** (`dataset_repo_slug`) berlabel **Data Sintesis**.
- Gagal → status kembali `closed` + tampilkan `generation_error` + tombol coba lagi.
- Sekunder/kumpulkan → langsung `solving`.

## 4. Tampilan untuk anggota (non-master)

- Saat `closed`: "Master sedang menyiapkan masalah & data."
- Saat `generating`: indikator proses.
- Saat `solving`: tampilkan **pernyataan masalah** (`getProblem`), metrik, dan dataset/panduan. (Ruang solusi penuh = Langkah 41.)

## 5. Data tak terstruktur (collect)

Bila `data_mode = "collect"`: tampilkan **panduan AI** (`unstructured_guidance_md`) menonjol sebagai checklist pengumpulan data. Unggah data oleh tim ditangani di Langkah 41.

## 6. Handler MSW

Tambah handler frame-problem (kembalikan contoh structured & unstructured), problem GET/PATCH, generate-data (simulasikan transisi generating→solving), dan ruang dengan `dataset_repo_slug`.

## 7. Definition of Done

- [ ] Master meramu masalah via AI; kuota & error 429 ditangani.
- [ ] Hasil dapat ditinjau & disunting sebelum generasi.
- [ ] Tiga mode data berfungsi; sintesis menampilkan progres lalu dataset berlabel sintesis.
- [ ] Anggota melihat masalah & dataset/panduan saat solving.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
