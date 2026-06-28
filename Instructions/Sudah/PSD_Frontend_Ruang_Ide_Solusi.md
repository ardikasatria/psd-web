# PSD — Instruksi Cursor: Ruang Ide — Ruang Solusi & Submit

> **Cara pakai:** Lampirkan bersama dokumen frontend. Fase solusi: template, kerja tim atas aset, unggah data (collect), submit, finish. **Kerjakan setelah backend Langkah 41 & Ruang Ide Data (Langkah 40).**

## 1. Skema & API

```ts
export const TemplateSchema = z.object({ sections: z.array(z.object({ key: z.string(), title: z.string() })) });
export const SubmissionSchema = z.object({ result_summary_md: z.string(), notebook_id: z.string().nullable(),
  asset_refs: z.array(z.object({ type: z.string(), slug: z.string() })), metrics: z.record(z.any()), submitted_by: z.string() });

// lib/api/rooms.ts
export const getTemplate = (slug: string) => apiFetch(`/idea-rooms/${slug}/solution-template`, TemplateSchema);
export const setTemplate = (slug: string, template: any) => apiFetch(`/idea-rooms/${slug}/solution-template`, TemplateSchema, { method: "PATCH", body: JSON.stringify({ template }) });
export const uploadRoomData = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/idea-rooms/${slug}/upload-data`, { method: "POST", body: fd, credentials: "include" }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
};
export const submitSolution = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/submit`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const getSubmission = (slug: string) => apiFetch(`/idea-rooms/${slug}/submission`, SubmissionSchema);
export const finishRoom = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/finish`, z.any(), { method: "POST", body: JSON.stringify(b) });
```

## 2. Ruang solusi — saat status `solving`

- **Pernyataan masalah** (`getProblem`, Langkah 40) + metrik usulan di atas.
- **Dataset/panduan:**
  - `synthetic`/`secondary` → kartu dataset (`dataset_repo_slug`) berlabel sumber/sintesis.
  - `collect` → **panduan AI** + tombol **Unggah data** (`uploadRoomData`) untuk anggota; setelah unggah tampilkan dataset.
- **Template solusi** (`getTemplate`): tampilkan bagian (Eksplorasi/Pemrosesan/Pemodelan/Evaluasi) sebagai kerangka kerja. Master dapat menyunting (`setTemplate`).
- **Kerja tim atas aset:** tombol cepat membuat aset **milik tim** (dataset/model/notebook/proyek) dengan `team_id` ruang (reuse form aset + pemilih pemilik = tim, Langkah 37). Tampilkan daftar aset tim ruang.

## 3. Submit (master)

Form submit: pilih **notebook** (dari notebook tim), **ringkasan hasil** (markdown), **aset** (centang dari aset tim → `asset_refs`), dan **metrik** (key-value). `submitSolution` → status `submitted`.

## 4. Finish (master) — saat `submitted`

- Tampilkan ringkasan submission (`getSubmission`).
- Tombol **Selesaikan ruang**: opsi **Bagikan aset ke proyek** (toggle) + **visibilitas** (publik/privat). `finishRoom({ publish_assets, visibility })`.
- Setelah selesai: status `finished`, tampilkan perayaan + **reputasi/badge** yang diperoleh tim (invalidate `["me","gamification"]`). Tampilkan aset yang dibagikan.

## 5. Tampilan anggota (non-master)

- `solving`: ikut membangun aset, unggah data (collect), lihat template & masalah.
- `submitted`: "Menunggu master menyelesaikan."
- `finished`: tampilkan hasil, aset terbagi, dan badge.

## 6. Handler MSW

Tambah handler template GET/PATCH, upload-data, submit/submission, finish (kembalikan finished). Sediakan ruang contoh di solving (synthetic & collect) dan submitted.

## 7. Definition of Done

- [ ] Template solusi tampil (default) & dapat disunting master.
- [ ] Mode collect: anggota mengunggah data → dataset ruang muncul.
- [ ] Aset tim dapat dibuat dengan kepemilikan tim ruang; tampil di ruang.
- [ ] Submit (master) menyimpan hasil; finish membagikan aset & menampilkan badge/reputasi.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
