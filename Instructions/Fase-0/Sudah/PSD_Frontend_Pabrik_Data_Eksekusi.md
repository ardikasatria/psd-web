# PSD — Instruksi Cursor: Pabrik Data — Eksekusi & Run (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Jalankan pipeline, lihat riwayat run, detail lapisan & lineage, indikator kuota. **Kerjakan setelah backend Langkah 45 & Pabrik Data Sumber (Langkah 44).**

## 1. Skema & API

```ts
export const FactoryQuotaSchema = z.object({ runs_per_day: z.number(), max_rows: z.number(), max_nodes: z.number(), runs_used_today: z.number() });
export const RunSummarySchema = z.object({ id: z.string(), status: z.enum(["queued","running","done","error"]),
  rows_out: z.number(), duration_ms: z.number(), created_at: z.string() });
export const RunDetailSchema = z.object({ id: z.string(), status: z.string(), rows_out: z.number(),
  layers: z.record(z.array(z.object({ node: z.string(), rows: z.number(), uri: z.string() }))),
  lineage: z.record(z.any()), error: z.string().nullable(), duration_ms: z.number() });

// lib/api/factory.ts
export const getFactoryQuota = () => apiFetch(`/me/factory/quota`, FactoryQuotaSchema);
export const runPipeline = (slug: string) => apiFetch(`/pipelines/${slug}/run`, z.object({ run_id: z.string(), status: z.string() }), { method: "POST" });
export const listRuns = (slug: string) => apiFetch(`/pipelines/${slug}/runs`, z.object({ items: z.array(RunSummarySchema) }));
export const getRun = (slug: string, runId: string) => apiFetch(`/pipelines/${slug}/runs/${runId}`, RunDetailSchema);
```

## 2. Tombol jalankan — di detail pipeline (`/factory/pipelines/[slug]`)

- Tampilkan **kuota** (`getFactoryQuota`): "Run hari ini: 2/5 · maks 50k baris · maks 8 node".
- Tombol **Jalankan** aktif hanya bila `status === "valid"` dan kuota tersisa. `runPipeline` → mulai polling run.
- Bila `429`: tampilkan ajakan naik tier.

## 3. Riwayat run

- Daftar run (`listRuns`): badge status, rows_out, durasi, waktu.
- Klik run → panel detail.

## 4. Detail run

- **Status** (poll `getRun` tiap ~2 dtk sampai done/error).
- **Lapisan**: per lapisan (bronze/silver/gold) daftar node + jumlah baris + tombol **Unduh Parquet** (dari `uri`; sediakan endpoint unduh bertanda tangan bila perlu, atau tautkan via proxy).
- **Lineage**: visual sederhana node → input (daftar/indentasi, atau mini-graph). Tunjukkan op & lapisan tiap node.
- **Error**: bila status error, tampilkan pesan (mis. timeout, kolom tak ada).

## 5. Catatan UX

- Tegaskan label **Data Sintesis** bila sumber berlabel sintesis (warisan Langkah 38) — agar hasil olahan tidak disalahartikan data resmi.
- Tampilkan durasi & batas timeout agar pengguna paham sandbox terbatas.

## 6. Handler MSW

Tambah handler quota, run (POST), runs list, run detail. Simulasikan transisi `queued→running→done` dan satu skenario `error` (timeout/kolom hilang). Sediakan layers contoh (bronze/silver/gold).

## 7. Definition of Done

- [ ] Jalankan hanya saat valid & kuota tersisa; kuota tampil akurat.
- [ ] Riwayat run & detail (status polling) berfungsi.
- [ ] Lapisan menampilkan baris & unduhan; lineage terbaca.
- [ ] Error run tampil jelas.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
