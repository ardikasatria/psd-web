# PSD — Instruksi Cursor: Pabrik Data — Engine Spark & Node Kode PySpark

> **Cara pakai:** Lampirkan bersama kanvas Pabrik Data (Langkah 38 frontend). Menambah **pemilih engine**
> (DuckDB/Spark), **node kode PySpark (.py)** dengan gate tier/grant, dan tampilan skrip PySpark/Spark SQL.
> Prasyarat: backend Langkah 39.

## 1. Skema & API

```ts
export const ENGINES = ["auto", "duckdb", "spark"] as const;
export const getEngines = () => apiFetch(`/datafactory/engines`, z.object({
  engines: z.array(z.string()), threshold_bytes: z.number(),
  raw_code_tier: z.string(),   // tier minimal untuk node kode .py (mis. "lanjut")
}));
export const compilePipeline = (id: string, engine: string) =>
  apiFetch(`/datafactory/pipelines/${id}/compile?engine=${engine}`, z.object({ script: z.string(), language: z.string() }), { method: "POST" });
export const runPipeline = (id: string, engine: string) =>
  apiFetch(`/datafactory/pipelines/${id}/run?engine=${engine}`, RunSchema, { method: "POST" });
```

## 2. Pemilih engine

- Kontrol di toolbar kanvas: **Engine = Auto / DuckDB / Spark**.
  - **Auto**: backend memilih dari ukuran data (kecil→DuckDB, besar→Spark). Tampilkan hint.
  - **DuckDB**: cepat, interaktif (jalur SQL Langkah 38).
  - **Spark**: data besar (jalur PySpark/Spark SQL).
- Tampilkan estimasi ukuran & engine terpilih ("Data ~3 GB → Spark").

## 3. Node kode PySpark (.py)

- Tambah node **PySpark** ke sidebar (tipe `pyspark`). Editor kode kecil dengan **kontrak**:
  ```python
  # inputs: list DataFrame dari node di atas; kembalikan satu DataFrame
  def transform(inputs):
      df = inputs[0]
      return df.dropDuplicates()
  ```
- **Gate**: node ini hanya untuk **tier 'lanjut' + grant akses kernel (Langkah 26)**. Bila tak memenuhi →
  node terkunci + ajakan ("Butuh tier Lanjut & akses kernel"). Node SQL (SELECT-only) tetap untuk tier menengah+.
- Peringatan halus: kode berjalan di lingkungan **terisolasi**; hanya dataset Anda yang tersedia.

## 4. Transparansi skrip

- Panel **"Skrip yang dijalankan"** (`compilePipeline`) menampilkan **PySpark** (Spark) atau **SQL**
  (DuckDB/Spark SQL) hasil kompilasi — read-only, untuk belajar & audit.

## 5. Menjalankan & error

- **Jalankan** (`runPipeline` dengan engine terpilih) → proses async; selesai → tautan **dataset hasil**.
- Error spesifik: `403` (node kode butuh tier 'lanjut'/grant), `kernel_access_required` (minta akses),
  `429` (kuota), `cycle`/`sink`/`forbidden_sql` (validasi), timeout job.

## 6. Handler MSW

Tambah handler: getEngines, compile (PySpark & SQL), run (spark: running→completed dengan dataset), serta
403 tier/grant untuk node kode, dan auto-route (kecil→duckdb, besar→spark).

## 7. Definition of Done

- [ ] Pemilih engine (auto/duckdb/spark) dengan hint ukuran → engine.
- [ ] Node kode PySpark tersedia untuk tier 'lanjut' + grant; terkunci untuk lainnya.
- [ ] Skrip hasil kompilasi (PySpark/SQL) ditampilkan (transparansi).
- [ ] Jalankan di Spark → hasil tertaut ke aset dataset; error tier/grant/kuota jelas.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
