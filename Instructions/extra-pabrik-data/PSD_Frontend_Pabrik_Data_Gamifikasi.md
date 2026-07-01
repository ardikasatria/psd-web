# PSD — Instruksi Cursor: Pemilih Dua Engine + Panel Quest + Umpan Balik Poin (Pabrik Data)

> **Cara pakai:** Lampirkan bersama kanvas Pabrik Data (Langkah 38/39 frontend) & panel gamifikasi.
> Menambah: **pemilih dua engine dengan panduan**, **panel quest**, dan **umpan balik poin**. Serta
> **halaman panduan lengkap** (lihat `PANDUAN_PABRIK_DATA.md`). Prasyarat: backend Langkah 40.

## 1. Skema & API

```ts
export const EngineLimitsSchema = z.object({
  tier: z.string(),
  engines: z.record(z.object({           // "duckdb" | "spark"
    allowed: z.boolean(), max_runs_per_day: z.number().optional(),
    max_bytes: z.number().optional(), raw_sql: z.boolean().optional(),
    raw_code: z.boolean().optional(),
  })),
});
export const getEngineLimits = () => apiFetch(`/datafactory/engines/limits`, EngineLimitsSchema);

export const QuestSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(),
  reward_points: z.number(),
  progress: z.object({ percent: z.number(), completed: z.boolean(),
    items: z.array(z.object({ event: z.string(), current: z.number(), target: z.number() })) }),
  claimable: z.boolean(), claimed: z.boolean(),
});
export const getQuests = () => apiFetch(`/quests`, z.array(QuestSchema));
export const claimQuest = (id: string) => apiFetch(`/quests/${id}/claim`, z.object({ awarded: z.number() }), { method: "POST" });
```

## 2. Pemilih dua engine (dengan panduan)

Saat user akan menjalankan pipeline, tampilkan **kartu dua opsi** (dari `getEngineLimits`):

- **Kartu DuckDB (SQL)** — "Cepat & interaktif untuk data kecil–menengah." Tampilkan batas tier
  (mis. "≤200 MB, 5 run/hari"), lencana kapabilitas (SQL mentah bila `raw_sql`).
- **Kartu Spark (PySpark)** — "Untuk data besar & terdistribusi." Bila `allowed=false` untuk tier user →
  kartu **terkunci** + ajakan ("Terbuka di tier Menengah") + tautan **"Pelajari cara naik tier"**.
  Bila `raw_code` → tampilkan lencana "Node kode .py (butuh akses kernel)".
- Tombol **"Panduan lengkap"** → buka halaman panduan (§ berikut).
- Pilihan **Auto** tetap ada (backend memilih dari ukuran data).

Saat menjalankan: tangani `403 engine_locked` (arahkan ke panduan/naik tier), `429 run_quota`,
`413 data_too_large` dengan pesan spesifik.

## 3. Halaman panduan lengkap

- Rute `/pabrik-data/panduan` (atau modal besar) merender `PANDUAN_PABRIK_DATA.md` (konten disediakan).
- Diakses dari: pemilih engine ("Panduan lengkap"), tombol bantuan di kanvas, dan menu Bantuan.
- Isi: kapan pakai DuckDB vs Spark, cara menyusun pipeline, node SQL & kode .py, batas tier, poin & quest.

## 4. Panel quest

- Panel/halaman **Quest** (`getQuests`): tiap quest tampil judul, deskripsi, **bar progres** (`progress.percent`),
  rincian kriteria (current/target), dan **reward poin**.
- Bila `claimable` → tombol **Klaim** (`claimQuest`) → animasi poin + perbarui daftar. Bila `claimed` →
  lencana "Selesai".
- Tautkan quest Pabrik Data ke aksi: quest "Naik ke Spark" → tombol cepat buka pemilih engine.

## 5. Umpan balik poin

- Setelah run sukses / publikasi dataset, tampilkan **toast poin** ("+10 poin • Pipeline sukses"). Bila
  suatu quest jadi `claimable` akibat aksi itu, tampilkan notifikasi "Quest selesai — klaim rewardmu".
- Tampilkan progres tier kecil (poin menuju tier berikutnya) di header Pabrik Data.

## 6. Handler MSW

Tambah handler: getEngineLimits (pemula: spark terkunci; menengah/lanjut terbuka), getQuests (progres
beragam + claimable), claimQuest (sukses + 409 tak claimable), serta error run 403/429/413.

## 7. Definition of Done

- [ ] Pemilih dua engine menampilkan kapabilitas & batas tier; Spark terkunci untuk pemula dengan ajakan.
- [ ] Halaman panduan lengkap dapat dibuka dari pemilih & bantuan.
- [ ] Panel quest menampilkan progres & klaim reward; toast poin muncul setelah aktivitas.
- [ ] Error engine (403/429/413) ditampilkan dengan pesan & arahan jelas.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
