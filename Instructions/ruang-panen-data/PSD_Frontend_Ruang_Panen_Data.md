# PSD — Instruksi Cursor: Ruang Panen Data (Scraping API → Dataset)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun **Ruang Panen Data**: wizard menyusun
> job panen dari API eksternal, jalankan async, pantau progres, dan **hasil tersalur ke aset dataset**.
> **Kerjakan setelah dataset & Celery.** Prasyarat: backend Langkah 37.
>
> **Nama fitur:** "Ruang Panen Data" (alternatif: "Jala Data" / "Saluran Data").

## 1. Skema & API

```ts
export const HarvestJobSchema = z.object({
  id: z.string(), name: z.string(),
  status: z.enum(["draft","queued","running","completed","failed","canceled"]),
  records_written: z.number(), result_dataset: z.string().nullable(), error: z.string().nullable(),
});
export const createJob = (b: object) => apiFetch(`/harvest/jobs`, HarvestJobSchema, { method: "POST", body: JSON.stringify(b) });
export const runJob = (id: string) => apiFetch(`/harvest/jobs/${id}/run`, z.any(), { method: "POST" });
export const listJobs = () => apiFetch(`/harvest/jobs`, z.array(HarvestJobSchema));
export const getJob = (id: string) => apiFetch(`/harvest/jobs/${id}`, HarvestJobSchema);
export const cancelJob = (id: string) => apiFetch(`/harvest/jobs/${id}/cancel`, z.any(), { method: "POST" });
export const retryJob = (id: string) => apiFetch(`/harvest/jobs/${id}/retry`, z.any(), { method: "POST" });
export const previewJob = (b: object) => apiFetch(`/harvest/preview`, z.object({ rows: z.array(z.record(z.any())) }), { method: "POST", body: JSON.stringify(b) });
```

## 2. Wizard buat job (langkah demi langkah)

1. **Sumber** — URL API (https), method, params (key-value), **auth** (none/api_key/bearer/basic; rahasia
   dikirim aman, tak ditampilkan lagi). Validasi klien: hanya https; tampilkan error server SSRF/allowlist
   ("Domain tidak dalam daftar izin", "Target internal diblokir").
2. **Paginasi** — strategi (none/page/offset/cursor), page_size, `records_path` (mis. `data.items`),
   `cursor_path` bila cursor, batas **max_pages/max_records**, dan **rate/menit** (kesopanan).
3. **Pemetaan field** — dari **Pratinjau** (`previewJob` ambil 1 halaman) tampilkan tabel; user memetakan
   kolom keluaran → path sumber (mis. `nama` ← `attr.name`). Boleh lewati (ambil apa adanya).
4. **Tujuan dataset** — **Buat dataset baru** (nama) **atau** **Tambah versi** ke dataset yang ada
   (pilih dari dataset milik user). Pilih format (csv/jsonl/parquet). **Tegaskan**: hasil akan menjadi
   aset dataset Anda.
5. **Tinjau & Jalankan** — ringkasan → `createJob` → `runJob`.

## 3. Pratinjau pemetaan

- Tombol **Pratinjau** memanggil `previewJob` (1 halaman, tanpa simpan) → tabel baris hasil `extract`.
  Bantu user memverifikasi `records_path` & pemetaan sebelum menjalankan penuh.

## 4. Daftar & progres job

- Halaman **Ruang Panen Data**: daftar job (`listJobs`) + status badge + `records_written`.
- Job berjalan → poll `getJob` (atau langganan) tampilkan progres. Selesai → tautan **"Lihat dataset"**
  ke `result_dataset` (halaman dataset Langkah 31).
- Aksi: **Batalkan** (running/queued), **Coba lagi** (failed/canceled), lihat pesan `error`.

## 5. Etika & keamanan (tampilkan ke user)

- Banner: "Panen hanya sumber yang Anda punya hak/izin aksesnya; hormati ketentuan (ToS) & rate limit."
- Bila domain tak diizinkan → pesan jelas + arahkan minta penambahan allowlist ke admin.
- Jangan pernah menampilkan kembali rahasia auth setelah disimpan.

## 6. Handler MSW

Tambah handler: createJob, runJob (queued), getJob (running→completed dengan result_dataset), listJobs,
cancel/retry, preview (baris contoh), serta kasus error: SSRF (`ssrf_blocked`), `not_allowlisted`,
`bad_scheme`, dan kuota (`429`).

## 7. Definition of Done

- [ ] Wizard menyusun job (sumber→paginasi→pemetaan→tujuan dataset) dengan pratinjau.
- [ ] Validasi https di klien; error SSRF/allowlist ditampilkan jelas.
- [ ] Job berjalan async dengan progres; selesai → tautan ke **dataset hasil**.
- [ ] Batal/coba-lagi berfungsi; rahasia auth tak pernah ditampilkan ulang.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
