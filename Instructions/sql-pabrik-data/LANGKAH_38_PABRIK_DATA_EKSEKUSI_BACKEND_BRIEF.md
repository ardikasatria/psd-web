# Langkah 38 — Backend Eksekusi Pabrik Data: Kompilasi DAG → SQL DuckDB (Tersandbox) + Node SQL

> **Tujuan:** Membuat pipeline Pabrik Data **bisa dieksekusi**. Kanvas (source/transform/…) dikompilasi
> menjadi **satu SQL DuckDB berbasis CTE**, dijalankan di koneksi **tersandbox**, lalu dimaterialisasi ke
> **MinIO (medallion)**. Tambah **node SQL mentah SELECT-only** (gate per tier) & **source dari aset
> dataset/output notebook**. **Menyempurnakan Pabrik Data/Ruang Analitik.** Prasyarat: dataset (31),
> DuckDB+MinIO engine, notebook (52b), gamifikasi (25), Celery (49).
>
> Logika inti **lulus 11 uji** di `psd-datafactory/app/datafactory/`.

## 1. Keputusan arsitektur (jawaban "bagaimana SQL")

- **SQL = mesin, bukan kotak teks bebas.** Semua node dikompilasi ke SQL DuckDB. "Tanpa SQL mentah dari
  user" tetap berlaku sebagai default (node visual meng-generate SQL); **node SQL mentah opsional & dibatasi**.
- **Node SQL mentah**: hanya **SELECT/WITH satu pernyataan**, hanya mengакses **CTE dari node upstream**,
  divalidasi menolak file/ekstensi/DDL/DML/komentar. **Gate per tier** (menengah/lanjut).
- **Sandbox DuckDB dikunci** sebelum eksekusi: `enable_external_access=false`, batas memori/thread,
  timeout, `lock_configuration=true`.
- **Source dari notebook**: bukan eksekusi kode inline — notebook memproduksi **aset dataset** (via
  `psd_lite`), lalu source membaca dataset itu (reproducible & aman).

## 2. Service (cermin scaffold teruji)

- `dag.topological_order/find_sink/inputs_map` — urutkan & validasi DAG (siklus, sink tunggal).
- `sql_guard.validate_select_sql` — guard node SQL mentah (SELECT-only, tolak berbahaya).
- `compiler.compile_pipeline(nodes, edges)` — hasilkan `WITH <ctes> SELECT * FROM <sink>` untuk DuckDB.
- `sandbox.duckdb_hardening/raw_sql_allowed/target_layer` — kunci koneksi, gate tier, lapisan medallion.

Jenis node yang didukung kompiler: `source, filter, select, aggregate, join, sql`. (Tambah node lain
dengan pola `_compile_<type>`.)

## 3. Alur eksekusi (Celery worker)

```
POST /datafactory/pipelines/{id}/run
  → check_quota(user, tier)
  → sql = compiler.compile_pipeline(nodes, edges)         # kompilasi DAG
  → con = duckdb.connect()
  → for stmt in sandbox.duckdb_hardening(): con.execute(stmt)   # KUNCI dulu
  → seams.register_source_relations(con, nodes)           # daftar view dataset (MinIO parquet)
  → seams.run_sql(con, sql, timeout_s=...)                # eksекusi
  → for node: seams.materialize(con, node_id, layer)      # tulis ke MinIO (bronze/silver/gold)
  → status completed; simpan referensi hasil (opsional → jadikan aset dataset gold)
```

- Node SQL mentah: bila ada dan `not raw_sql_allowed(tier)` → tolak 403 sebelum kompilasi.
- Register source: **hanya** relasi dataset yang dikontrol platform (identifier aman). Jangan pernah
  menyisipkan path file dari user (baca-file/SSRF).

## 4. Model (ringkas)

```python
class Pipeline(Base):
    __tablename__ = "df_pipelines"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pl_{uuid.uuid4().hex[:12]}")
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    graph: Mapped[str] = mapped_column(Text)   # JSON {nodes, edges}
    status: Mapped[str] = mapped_column(String, default="draft")
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result_dataset: Mapped[str | None] = mapped_column(String, nullable=True)  # dataset gold hasil
```

## 5. Endpoint — `app/modules/datafactory/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/datafactory/pipelines` | Simpan kanvas {nodes, edges}. |
| POST | `/datafactory/pipelines/{id}/validate` | `topological_order`+`find_sink`+kompilasi (dry-run) → kembalikan SQL & error node. |
| POST | `/datafactory/pipelines/{id}/preview` | Eksekusi `LIMIT n` (sandbox) → sampel baris (tanpa materialisasi). |
| POST | `/datafactory/pipelines/{id}/run` | Eksekusi penuh (Celery) → materialisasi medallion; opsional simpan gold sebagai **aset dataset**. |
| GET | `/datafactory/pipelines/{id}/runs` | Riwayat run + status. |
| GET | `/datafactory/sources` | Aset dataset milik user (termasuk output notebook) sebagai kandidat source. |

## 6. Definition of Done

- [ ] Kanvas dikompilasi ke SQL DuckDB (CTE) & **dieksekusi** (masalah "tidak bisa dieksekusi" tuntas).
- [ ] Node SQL mentah SELECT-only tersandbox, gate per tier; guard menolak file/DDL/DML/komentar.
- [ ] Koneksi DuckDB di-hardening sebelum SQL user (akses eksternal mati, batas sumber daya, timeout).
- [ ] Source membaca aset dataset (termasuk output notebook), bukan eksekusi kode inline.
- [ ] Hasil dimaterialisasi ke MinIO medallion; gold opsional jadi aset dataset.
- [ ] Logika (cermin `psd-datafactory/app/datafactory/tests/`) hijau.

## 7. Gotcha (keamanan — penting)

- **Sandbox DUCKDB wajib**: guard SQL saja tidak cukup; `enable_external_access=false` + `lock_configuration=true`
  mencegah baca file/http/ekstensi. Jalankan tiap run di proses/kontainer terisolasi + timeout + batas memori.
- **Hanya SELECT-only** untuk node SQL; satu pernyataan; tolak komentar (anti-obfuscation) & tabel sistem.
- **Identifier di-quote & divalidasi** (relation/kolom) — cegah injeksi lewat nama.
- **Source terkontrol**: daftarkan view dari parquet MinIO milik platform; user tak boleh menaruh path.
- **Kuota per tier**: eksekusi boros CPU/memori — gate ukuran & frekuensi (gamifikasi).
- **Predikat/ekspresi node visual** juga permukaan injeksi — lewati guard ringan atau bangun dari builder aman.
