# PSD — Instruksi Cursor: Mesin Data Sintesis (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Form sintesis, kuota tier, pemantauan job, editor spec, pratinjau, terbitkan dataset. **Kerjakan setelah backend Langkah 38.**

## 1. Skema & API

```ts
export const SynthJobSchema = z.object({ id: z.string(),
  status: z.enum(["queued","planning","generating","done","failed"]),
  prompt: z.string().nullable(), spec: z.any().nullable(), n_rows: z.number(),
  result_url: z.string().nullable(), preview: z.array(z.record(z.string())).nullable(),
  dataset_slug: z.string().nullable(), error: z.string().nullable() });

// lib/api/synthesis.ts
export const getSynthQuota = () => apiFetch(`/me/synthesis/quota`, SynthQuotaSchema);
export const createSynthJob = (b: any) => apiFetch(`/synthesis/jobs`, z.object({ job_id: z.string(), status: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const getSynthJob = (id: string) => apiFetch(`/synthesis/jobs/${id}`, SynthJobSchema);
export const getMySynthJobs = () => apiFetch(`/me/synthesis/jobs`, z.object({ items: z.array(SynthJobSchema) }));
export const publishSynthDataset = (id: string, b: any) => apiFetch(`/synthesis/jobs/${id}/publish`, z.any(), { method: "POST", body: JSON.stringify(b) });
```

## 2. Halaman Sintesis — `/synthesis`

- **Kuota** (atas): dari `getSynthQuota()` — "Sisa {plans_left}/{plans_per_day} rencana AI hari ini · maks {max_rows} baris (tier Anda)". Bila habis → ajak naik tier (tautan ke gamifikasi).
- **Form:**
  - Mode **Dari masalah** (prompt natural-language) → memakai 1 kuota AI.
  - Mode **Skema manual** (tabel kolom: nama, dtype, params) → **tidak** memakai kuota AI.
  - Input `n_rows` (dibatasi `max_rows`), nama dataset.
- Submit → `createSynthJob` → terima `job_id`.

## 3. Pemantauan job (polling)

- `useQuery(getSynthJob(id), { refetchInterval: (q) => ["done","failed"].includes(q.state.data?.status) ? false : 2000 })`.
- Tampilkan status berurutan: Antre → Merancang (AI) → Membuat data → Selesai. Bila `failed` → tampilkan `error` + tombol coba lagi.

## 4. Hasil & editor spec

- **Spec editor:** tampilkan `spec.columns` (nama, dtype, params) yang bisa **diedit**; tombol **Buat ulang dengan spec ini** mengirim job baru dengan `spec` (tanpa kuota AI). Ini mendorong iterasi hemat biaya.
- **Pratinjau:** render `preview` (20 baris pertama) sebagai tabel.
- **Unduh:** tautan `result_url` (CSV).
- **Terbitkan sebagai dataset:** form (judul, visibilitas) → `publishSynthDataset`. Setelah terbit, tautkan ke halaman dataset.

## 5. Label sintesis (wajib)

Di mana pun dataset sintesis muncul (pratinjau, kartu, halaman dataset): tampilkan **badge "Data Sintesis"** dan catatan singkat bahwa ini data buatan, bukan data resmi. Tampilkan `generation_spec` (kolom & aturan) untuk transparansi/reproduksi.

## 6. Riwayat — bagian di `/synthesis`

Daftar job dari `getMySynthJobs()` (status, n_rows, tanggal, tautan hasil).

## 7. Handler MSW

Tambah handler kuota, create job, status (simulasikan transisi queued→done), riwayat, publish. Sertakan satu skenario `failed`.

## 8. Definition of Done

- [ ] Kuota tier tampil & memandu; mode prompt memakai kuota, mode/edit spec tidak.
- [ ] Job dipantau via polling dengan status jelas; gagal ditangani.
- [ ] Spec dapat diedit & dibuat ulang tanpa kuota AI; pratinjau & unduh berfungsi.
- [ ] Terbitkan dataset berlabel **Data Sintesis** + spec tampil.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
