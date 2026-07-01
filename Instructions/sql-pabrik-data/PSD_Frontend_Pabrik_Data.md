# PSD — Instruksi Cursor: Pabrik Data — Kanvas Dapat Dieksekusi + Node SQL

> **Cara pakai:** Lampirkan bersama editor kanvas Pabrik Data (React Flow). Membuat pipeline **bisa
> dieksekusi**: validasi, pratinjau, jalankan (materialisasi ke dataset), tambah **node SQL** & **source
> dari aset dataset/output notebook**. Prasyarat: backend Langkah 38.

## 1. Skema & API

```ts
export const PipelineGraph = z.object({
  nodes: z.array(z.object({ id: z.string(), type: z.enum(["source","filter","select","aggregate","join","sql"]), params: z.record(z.any()) })),
  edges: z.array(z.tuple([z.string(), z.string()])),
});
export const savePipeline = (id: string, graph: object) => apiFetch(`/datafactory/pipelines/${id}`, z.any(), { method: "POST", body: JSON.stringify({ graph }) });
export const validatePipeline = (id: string) => apiFetch(`/datafactory/pipelines/${id}/validate`, z.object({ sql: z.string(), errors: z.array(z.any()) }), { method: "POST" });
export const previewPipeline = (id: string, limit = 50) => apiFetch(`/datafactory/pipelines/${id}/preview`, z.object({ rows: z.array(z.record(z.any())) }), { method: "POST", body: JSON.stringify({ limit }) });
export const runPipeline = (id: string) => apiFetch(`/datafactory/pipelines/${id}/run`, RunSchema, { method: "POST" });
export const listSources = () => apiFetch(`/datafactory/sources`, z.array(SourceSchema)); // aset dataset + output notebook
```

## 2. Panel node di sidebar

- **Source** — pilih dari **aset dataset** milik user (termasuk **output notebook** yang sudah jadi
  dataset). Bukan path file bebas. Tampilkan skema kolom.
- **Filter** — bangun predikat (kolom/operator/nilai) → `params.predicate`.
- **Select** — pilih kolom (`params.columns`).
- **Aggregate** — group by + agregasi (count/sum/avg/min/max) (`params.group_by`, `params.aggregations`).
- **Join** — dua input, kondisi `on`, tipe (inner/left/right/full).
- **SQL** *(hanya tier menengah/lanjut)* — editor SQL **SELECT-only** yang merujuk node upstream sebagai
  tabel (nama = id node). Tampilkan hint: "Hanya SELECT; akses hanya ke node di atasnya." Bila tier tak
  cukup → node dikunci + ajakan naik tier.

## 3. Alur kerja kanvas

1. **Susun** node & sambungkan (React Flow). Satu **sink** (node keluaran) wajib.
2. **Validasi** (`validatePipeline`) → tampilkan SQL hasil kompilasi (read-only, untuk transparansi) +
   tandai node bermasalah (siklus, sink ganda, SQL terlarang, identifier tak valid).
3. **Pratinjau** (`previewPipeline`) → tabel sampel (LIMIT) tanpa menyimpan.
4. **Jalankan** (`runPipeline`) → proses async; saat selesai tampilkan tautan **"Lihat dataset hasil"**
   (lapisan gold jadi aset dataset). Tampilkan status per lapisan medallion (bronze/silver/gold) bila ada.

## 4. Transparansi SQL

- Panel "SQL yang dijalankan" menampilkan hasil kompilasi kanvas (hanya baca) — membantu user memahami &
  belajar SQL. Node SQL mentah muncul apa adanya di dalamnya.

## 5. Penanganan error

- Tampilkan pesan spesifik: `cycle` (ada loop), `sink` (harus satu keluaran), `forbidden_sql`/`not_select`/
  `multi_statement` (SQL), `bad_identifier`, `403` (SQL mentah butuh tier lebih tinggi), `429` (kuota).

## 6. Handler MSW

Tambah handler: listSources (dataset + output notebook), validate (sukses dengan SQL + kasus error),
preview (baris contoh), run (running→completed dengan result_dataset), serta 403 tier & 429 kuota.

## 7. Definition of Done

- [ ] Kanvas dapat **divalidasi, dipratinjau, dijalankan**; hasil tertaut ke aset dataset.
- [ ] Source memilih aset dataset/output notebook (bukan path bebas).
- [ ] Node SQL SELECT-only tersedia untuk tier yang sesuai; terkunci untuk tier rendah.
- [ ] SQL hasil kompilasi ditampilkan (transparansi); error node jelas.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
