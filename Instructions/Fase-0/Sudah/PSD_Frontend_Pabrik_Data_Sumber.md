# PSD — Instruksi Cursor: Pabrik Data — Sumber & Spec Pipeline (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Kelola sumber data + daftar/buat pipeline + validasi. **Kerjakan setelah backend Langkah 44.** Catatan: kanvas drag-drop penuh ada di Langkah 47 — di sini cukup scaffolding + editor spec JSON sementara.

## 1. Skema & API

```ts
export const DataSourceSchema = z.object({ id: z.string(), name: z.string(), uri: z.string(), kind: z.string() });
export const PipelineNodeSchema = z.object({ id: z.string(),
  type: z.enum(["source","transform","sink"]),
  op: z.enum(["select","filter","join","aggregate","cast","derive","dedupe"]).optional(),
  layer: z.enum(["bronze","silver","gold"]).nullable().optional(),
  params: z.record(z.any()).default({}) });
export const PipelineSpecSchema = z.object({ nodes: z.array(PipelineNodeSchema), edges: z.array(z.object({ source: z.string(), target: z.string() })) });
export const PipelineSchema = z.object({ slug: z.string(), title: z.string(),
  status: z.enum(["draft","valid","error"]), spec: PipelineSpecSchema.optional(),
  validation_error: z.string().nullable().optional(), team_id: z.string().nullable().optional(), room_id: z.string().nullable().optional() });

// lib/api/factory.ts
export const registerSource = (dataset_slug: string, name?: string) => apiFetch(`/data-sources`, z.object({ id: z.string(), uri: z.string() }), { method: "POST", body: JSON.stringify({ dataset_slug, name }) });
export const listSources = () => apiFetch(`/data-sources`, z.object({ items: z.array(DataSourceSchema) }));
export const deleteSource = (id: string) => apiFetch(`/data-sources/${id}`, z.any(), { method: "DELETE" });
export const createPipeline = (b: any) => apiFetch(`/pipelines`, z.object({ slug: z.string(), status: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const listPipelines = () => apiFetch(`/pipelines`, PaginatedPipeline);
export const getPipeline = (slug: string) => apiFetch(`/pipelines/${slug}`, PipelineSchema);
export const updatePipeline = (slug: string, b: any) => apiFetch(`/pipelines/${slug}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const validatePipeline = (slug: string) => apiFetch(`/pipelines/${slug}/validate`, z.object({ status: z.string(), errors: z.array(z.string()) }), { method: "POST" });
export const deletePipeline = (slug: string) => apiFetch(`/pipelines/${slug}`, z.any(), { method: "DELETE" });
```

## 2. Sumber data — `/factory/sources`

- Daftar sumber (`listSources`): nama, URI, jenis.
- Tombol **Daftarkan dataset**: pilih dataset (reuse pencarian/registry) → `registerSource`. Tampilkan URI hasil (`psd://dataset/...`).
- Hapus sumber.

## 3. Pipeline — `/factory/pipelines`

- Daftar pipeline (`listPipelines`): judul + **badge status** (Draft/Valid/Error).
- Tombol **Pipeline baru**: judul (+ opsi tim) → `createPipeline` → buka detail.

## 4. Detail pipeline — `/factory/pipelines/[slug]`

> Editor kanvas penuh = Langkah 47. Untuk sekarang:
- Tampilkan **status** + **pesan validasi** (`validation_error`) bila ada.
- **Editor spec sementara**: textarea JSON untuk `spec` (nodes/edges) → tombol **Simpan** (`updatePipeline`) → tombol **Validasi** (`validatePipeline`) menampilkan daftar `errors`.
- Tampilkan ringkasan node (jumlah per tipe/lapisan) bila JSON valid.
- Tautan ke sumber yang dipakai (cocokkan `params.source_id` → daftar sumber).
- Catatan kecil di UI: "Editor visual hadir di rilis berikutnya."

## 5. Handler MSW

Tambah handler sources (list/register/delete) & pipelines (CRUD/validate). Sertakan contoh pipeline `valid` dan `error` (mis. graf bersiklus) untuk menguji tampilan error.

## 6. Definition of Done

- [ ] Sumber dapat didaftarkan dari dataset & tampil dengan URI.
- [ ] Pipeline dapat dibuat; spec disimpan & divalidasi; error tampil jelas.
- [ ] Status badge benar (draft/valid/error).
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
