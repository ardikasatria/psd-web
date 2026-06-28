# PSD — Instruksi Cursor: Pabrik Data — Kanvas React Flow (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Editor kanvas drag-drop menggantikan editor JSON sementara (Langkah 44). Palet node, panel properti dengan pemilih kolom, jalankan, lineage. **Kerjakan setelah backend Langkah 47 & Pabrik Data 44–46.**

## 1. Pustaka

```bash
npm i @xyflow/react
```

Impor `import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge } from "@xyflow/react"; import "@xyflow/react/dist/style.css";`

## 2. API tambahan

```ts
// lib/api/factory.ts
export const getSourceSchema = (id: string) => apiFetch(`/data-sources/${id}/schema`, z.object({ columns: z.array(z.object({ name: z.string(), type: z.string() })) }));
// (reuse: getPipeline, updatePipeline, validatePipeline, runPipeline, listSources, getRun dari Langkah 44/45)
```

## 3. Format spec ↔ React Flow

Pipeline `spec` = `{ nodes:[{id,type,op?,layer?,params, position?{x,y}}], edges:[{source,target}] }`.

- **Muat**: petakan tiap spec-node → React Flow node `{ id, type:"psdNode", position: n.position||auto, data:{ kind:n.type, op:n.op, layer:n.layer, params:n.params } }`; spec-edge → RF edge `{ id, source, target }`.
- **Simpan**: kebalikannya → `updatePipeline(slug,{spec})`. Sertakan `position` agar tata letak tersimpan (backend mengabaikan field ekstra; validasi tetap jalan). Setelah simpan, panggil `validatePipeline` dan tandai node error.

## 4. Palet node

Sidebar kiri, drag ke kanvas (atau klik untuk tambah):
- **Source** (1 per dataset) — pilih dari `listSources`.
- **Transform** — dengan dropdown op: select / filter / join / aggregate / cast / derive / dedupe.
- **Sink** — keluaran (default lapisan gold).

Node kustom `psdNode` menampilkan: ikon kind, label op, **badge lapisan** (bronze/silver/gold) berwarna, dan handle input/output (source: hanya output; sink: hanya input; transform: keduanya; join: dua input handle).

## 5. Panel properti (kanan, saat node dipilih)

Sesuai kind/op, dengan **pemilih kolom** dari skema:
- **Source**: pilih `source_id` (dari daftar sumber); muat kolomnya via `getSourceSchema` → simpan ke state `columnsByNode[id]`.
- **select**: multiselect kolom (dari kolom hulu).
- **filter**: kolom + operator (=,≠,>,<,≥,≤,in,contains) + nilai.
- **join**: `how` (inner/left) + `left_on` (kolom input-1) + `right_on` (kolom input-2).
- **aggregate**: `group_by` (multiselect) + daftar `aggs` [{col, fn(sum/avg/count/min/max), as}].
- **cast**: daftar `casts` [{col, to(int/double/varchar/date/bool)}].
- **derive**: `name` + `expr` (validasi sederhana: hanya kolom, angka, + - * / ( )).
- **dedupe**: tanpa parameter.
- **layer** (semua node): pilih bronze/silver/gold/none.

**Inferensi kolom hilir (klien):** hitung kolom keluaran tiap node dari kolom hulu:
- select → kolom terpilih; aggregate → group_by + `as`; derive → kolom hulu + nama baru; cast/filter/dedupe → sama; join → gabungan kedua input; source → dari skema. Pakai ini untuk mengisi pemilih kolom node hilir tanpa harus run.

## 6. Toolbar

- **Simpan** (`updatePipeline`) + indikator status (draft/valid/error).
- **Validasi** (`validatePipeline`) → tandai node bermasalah (border merah + tooltip pesan; cocokkan teks error yang menyebut id node).
- **Jalankan** (`runPipeline`, aktif bila valid & kuota tersisa — tampilkan kuota dari `/me/factory/quota`) → mulai polling run.
- Tautan ke **Ruang Analitik**: "Buat dashboard dari pipeline ini".

## 7. Hasil run & lineage

- Setelah run selesai (`getRun`): tampilkan ringkasan lapisan (bronze/silver/gold + jumlah baris) dan tombol unduh Parquet.
- **Lineage overlay**: sorot jalur node menggunakan `lineage` (input tiap node) — mis. warnai edge sesuai aliran, atau daftar urutan eksekusi.
- Error run → tampilkan pesan + sorot tahap gagal bila bisa.

## 8. Hapus editor JSON sementara

Ganti placeholder JSON di `/factory/pipelines/[slug]` (Langkah 44) dengan kanvas ini. Pertahankan tampilan status & daftar run.

## 9. Handler MSW

`getSourceSchema` (kolom contoh). Reuse handler pipeline/run. Sediakan pipeline contoh dengan beberapa node & posisi agar kanvas termuat terisi.

## 10. Definition of Done

- [ ] Kanvas memuat/menyimpan spec (dengan posisi) bolak-balik tanpa kehilangan data.
- [ ] Tambah/sambung node; panel properti mengonfigurasi params dengan pemilih kolom dari skema + inferensi hilir.
- [ ] Validasi menandai node error; jalankan menghormati kuota; hasil & lineage tampil.
- [ ] Badge lapisan & tipe node jelas; join punya dua input.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
