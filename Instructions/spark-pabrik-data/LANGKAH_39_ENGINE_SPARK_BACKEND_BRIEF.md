# Langkah 39 — Backend Engine Spark (PySpark): DAG→PySpark, Node Kode .py Terisolasi, Spark SQL

> **Tujuan:** Menambah **engine Spark** ke Pabrik Data untuk data besar, dengan tiga jalur: **(a) DAG
> visual → PySpark yang di-generate** (aman), **(b) Spark SQL** (guard SQL sama seperti DuckDB), dan
> **(c) node kode .py PySpark mentah** yang dijalankan sebagai **Spark job TERISOLASI** (bukan guard
> statis). Melengkapi Langkah 38 (DuckDB). Prasyarat: 38, Spark/Airflow (54), kernel-access (26),
> gamifikasi (25), JupyterHub/isolasi (52), MinIO.
>
> Logika inti **lulus 6 uji Spark** (total 17 di `psd-datafactory/app/datafactory/`).

## 1. Keputusan arsitektur (jawaban "kalau pakai Spark/.py")

- **SQL bisa di-guard statis; kode .py TIDAK.** Regex tak bisa memblokir `import os`, `eval`, dll. secara
  andal → keamanan kode arbitrer = **ISOLASI kontainer/pod**, bukan validasi teks.
- **Tiga jalur Spark:**
  - **(a) Generated PySpark** — DAG yang sama dikompilasi ke DataFrame API. Aman (bukan kode user).
  - **(b) Spark SQL** — node SQL SELECT-only, guard sama seperti DuckDB, jalan di Spark. **Paling aman
    untuk warehouse terstruktur skala besar.**
  - **(c) Node kode .py mentah** — fleksibel tapi berisiko → **Spark job terisolasi**, gate **tier
    'lanjut' + grant akses kernel (Langkah 26)**.
- **Routing engine**: kecil → DuckDB (instan, murah); besar → Spark (`choose_engine` by ukuran / pilihan user).

## 2. Service (cermin scaffold teruji)

- `engine.choose_engine/validate_engine` — pilih duckdb vs spark.
- `spark_compiler.compile_pipeline_pyspark(nodes, edges)` — DAG → skrip PySpark; node visual di-generate,
  node `pyspark` dibungkus kontrak `def transform(inputs): return df`.
- `spark_compiler.has_raw_code(nodes)` — deteksi ada node kode mentah.
- `spark_job.raw_code_allowed(tier)` (hanya 'lanjut') & `build_job_spec(...)` (isolasi + `requires_grant`).
- Reuse `dag`, `sql_guard` (Spark SQL memakai guard yang sama).

## 3. Alur eksekusi Spark (Airflow/Spark submit)

```
POST /datafactory/pipelines/{id}/run?engine=spark
  → engine = choose_engine(requested, est_bytes)
  → if spark_compiler.has_raw_code(nodes):
        if not spark_job.raw_code_allowed(tier): 403 kernel/tier
        require_server_access(grant)            # Langkah 26 (grant + konkuren)
  → script = spark_compiler.compile_pipeline_pyspark(nodes, edges)   # atau compile_pipeline (Spark SQL)
  → simpan script ke MinIO (script_key)
  → spec = spark_job.build_job_spec(script_key, user, tier, has_raw_code=...)
  → submit ke Spark (spark-submit/K8s/Livy) TERISOLASI: tanpa mount host, egress terkunci,
     batas cpu/mem, timeout, identitas = user
  → hasil (gold) dimaterialisasi → jadikan aset DATASET (seperti jalur DuckDB)
```

- **Spark SQL** (jalur b): kompilasi DAG → SQL (kompiler Langkah 38) lalu `spark.sql(...)` di dalam skrip.
  Guard SELECT-only tetap berlaku; tak butuh grant kernel (tak ada kode arbitrer).

## 4. Isolasi (wajib untuk node kode .py)

- Eksekutor Spark di **kontainer/pod terpisah**: `host_mounts=false`, `read_only_root`, **egress dibatasi**
  ke cluster + MinIO saja (cegah exfiltrasi/SSRF), batas `executor_memory/cores`, `timeout_s`.
- Jalankan **sebagai identitas user** (OIDC); hanya dataset milik/diizinkan yang didaftarkan.
- Reuse infra isolasi notebook/JupyterHub (Langkah 52) & Spark (Langkah 54) — jangan bikin sandbox baru.

## 5. Endpoint (tambahan pada `datafactory/router.py`)

| Method | Path | Aksi |
|---|---|---|
| POST | `/datafactory/pipelines/{id}/run` | Param `engine` (auto/duckdb/spark). Spark → kompilasi + submit job terisolasi. |
| POST | `/datafactory/pipelines/{id}/compile?engine=spark` | Kembalikan skrip PySpark/Spark SQL (transparansi, read-only). |
| GET | `/datafactory/engines` | Engine tersedia + ambang ukuran + kelayakan tier untuk kode .py. |

## 6. Definition of Done

- [ ] Pipeline bisa dijalankan di **Spark** untuk data besar; auto-route atau pilihan user.
- [ ] DAG visual dikompilasi ke **PySpark** (aman) dan/atau **Spark SQL** (guard sama).
- [ ] Node kode **.py mentah** hanya untuk tier 'lanjut' + grant kernel, dijalankan **terisolasi**.
- [ ] Isolasi ditegakkan (tanpa mount host, egress terkunci, batas sumber daya, timeout, identitas user).
- [ ] Hasil disalurkan ke aset dataset (gold), seperti jalur DuckDB.
- [ ] Logika (cermin `psd-datafactory/app/datafactory/tests/test_spark.py`) hijau.

## 7. Gotcha

- **JANGAN guard kode .py dengan regex** — pasti bisa dilewati; andalkan isolasi kontainer.
- **Kode mentah = grant + tier 'lanjut'** (lebih ketat dari SQL mentah yang menengah+).
- **Egress eksekutor dibatasi** (cegah exfiltrasi data/SSRF dari dalam job).
- **Identitas & data**: job hanya melihat dataset user; daftarkan relasi terkontrol (bukan path bebas).
- **Spark mahal**: jangan submit untuk data kecil — `choose_engine` mencegah pemborosan (pakai DuckDB).
- **Kontrak node kode**: `def transform(inputs): return df` — dokumentasikan; validasi output DataFrame di runner.
