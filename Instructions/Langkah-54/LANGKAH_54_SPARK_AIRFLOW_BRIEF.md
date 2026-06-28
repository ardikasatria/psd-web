# Brief Agen Cursor — Langkah 54: Jalur Eksekusi Spark/Airflow 🔴 (opsional)

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 54 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bersandar pada spec DAG Langkah 44–45 & Celery Langkah 49.
> Scaffold referensi **lulus 10 uji** di `psd-engine/`.
>
> ⏸️ **OPSIONAL & DAPAT DITANGGUHKAN.** Untuk pengajaran, **DuckDB cukup**. Kerjakan hanya bila ada
> data benar-benar besar. ⚠️ Item 🔴 — pecah jadi sub-langkah; jangan sekali jadi.

---

## 1. Tujuan & prinsip utama

Tambah jalur eksekusi untuk pipeline **skala besar** di luar kemampuan DuckDB.

**Prinsip yang dikunci (catatan jujur roadmap):** **kanvas & spec TIDAK berubah** — hanya backend
eksekusi yang ditukar. Spec DAG yang sama (Langkah 44–45) diterjemahkan ke DuckDB *atau* Spark.

**Prasyarat:** Langkah 44–45 (spec DAG & engine) + Langkah 49 (Celery/orkestrasi).

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Spec engine-agnostik adalah sumber kebenaran.** Penerjemah/eksekutor menyesuaikan diri; spec tidak.
2. **Pemilih engine per pipeline**: pilihan eksplisit menang; 'auto' → bandingkan estimasi ukuran data
   dgn ambang; default **DuckDB** (hindari biaya Spark tanpa perlu).
3. **Spark IO di balik seam** (`read_fn`/`write_fn`) agar `psd://` & format tertangani satu tempat.
4. **Airflow hanya untuk pipeline TERJADWAL**; eksekusi ad-hoc tetap via Celery (Langkah 49).
5. **Routing antrian**: DuckDB → `pabrik_data` (Langkah 49); Spark → antrian/worker **`spark`** khusus.
6. DuckDB tetap jalur default & utama untuk konteks edukasi.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] **Bentuk spec DAG Langkah 44–45** persisnya (nama field node: id/type/params/inputs?).
      Scaffold memakai `Node(id,type,params,inputs)` + tipe `source/sql/join/sink` — **petakan ke
      bentuk asli** di adaptor, jangan ubah kanvas.
- [ ] Eksekutor DuckDB Langkah 45 (`run_pipeline_job`) — antarmuka & cara memanggilnya.
- [ ] Apakah ada **estimasi ukuran data** per dataset/pipeline (untuk pemilih 'auto')?
- [ ] Celery Langkah 49: cara menambah antrian/worker `spark`.
- [ ] Apakah benar-benar ADA kebutuhan data besar sekarang? (Bila tidak → tangguhkan langkah ini.)
- [ ] Infra Spark (cluster/standalone/K8s) & Airflow (jika dipakai) tersedia atau perlu disediakan.

**Pertanyaan untuk manusia:**
1. Apakah Spark benar dibutuhkan kini, atau cukup siapkan kerangka & tunda implementasi penuh?
2. Ambang ukuran untuk auto-pilih Spark (default 5 GiB)?
3. Cluster Spark: standalone, YARN, atau Spark-on-K8s?

---

## 4. Sub-langkah (kerangka — akan pecah)

### 54.1 — Backend eksekusi Spark
- Cermin `spec.py` (spec + topologi), `spark_plan.py` (spec→langkah Spark), `spark_executor.py`
  (terapkan ke SparkSession; IO via `read_fn`/`write_fn`).
- Implementasi nyata `read_fn`/`write_fn`: `session.read.format(...).load(...)` (resolusi `psd://`) &
  `df.write.format(...).save/saveAsTable(...)`.

### 54.2 — Orkestrasi Airflow (terjadwal)
- Cermin `airflow_gen.py`: spec → DAG Airflow (task per node + dependensi).
- Sediakan `app/engine/airflow_runtime.py:run_node` yang dipanggil tiap task (jalankan node via engine).

### 54.3 — Pemilih engine per pipeline
- Cermin `selector.py` + `dispatch.py`: pilih engine, route ke antrian Celery yang tepat.
- UI: opsi engine per pipeline (auto/duckdb/spark).

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| Adaptor spec | Petakan spec DAG Langkah 44–45 → `Pipeline/Node` (atau sebaliknya). |
| `read_fn`/`write_fn` | IO Spark nyata (resolusi `psd://`, format, sink gold). |
| Estimasi ukuran | Sediakan `est_bytes` per pipeline untuk pemilih 'auto'. |
| Celery `spark` | Tambah antrian/worker Spark (Langkah 49); enqueue sesuai `dispatch.plan_execution`. |
| `run_node` | Eksekutor per-node untuk task Airflow. |

---

## 6. Definition of Done

- [ ] Spec yang sama berjalan di DuckDB **dan** Spark tanpa mengubah kanvas/spec.
- [ ] Pemilih engine: eksplisit menang; auto sesuai ambang; default DuckDB.
- [ ] Spark menjalankan read→sql/join→write dengan urutan topologis benar.
- [ ] Pipeline terjadwal berjalan via Airflow (task+dependensi sesuai spec).
- [ ] Dispatch route DuckDB→`pabrik_data`, Spark→`spark`.
- [ ] Uji (cermin `psd-engine/app/engine/tests/test_engine.py`) hijau.

---

## 7. Non-goals

- Mengganti DuckDB sebagai default (DuckDB tetap utama untuk edukasi).
- Optimasi Spark lanjutan (tuning partisi, broadcast join) di luar kebutuhan nyata.
- Streaming (di luar lingkup; pipeline batch saja di sini).

---

## 8. Gotcha (dari verifikasi scaffold)

- **Spec tidak berubah** lintas engine — bila tergoda mengubah bentuk spec untuk Spark, itu salah arah;
  ubah penerjemah/adaptor saja.
- **Urutan topologis + deteksi siklus** wajib sebelum eksekusi (cegah DAG tak valid).
- **join → SQL**: node join diterjemahkan ke SQL Spark; SQL node mengandalkan nama view = id node.
- **IO Spark di seam**: jangan tanam logika `psd://`/format di eksekutor inti; taruh di `read_fn`/`write_fn`.
- **Antrian Spark terpisah**: job Spark berat — jangan campur dgn `pabrik_data` agar tak menyumbat.
- **DuckDB single-writer** (dari Langkah 49) tetap berlaku untuk jalur DuckDB.

---

## 9. Referensi terverifikasi

`psd-engine/` **lulus 10 uji** (topologi valid, siklus & input tak dikenal ditolak, pemilih eksplisit &
ambang, rencana Spark + join→SQL, eksekutor pada session tiruan, graph & render DAG Airflow, routing
dispatch) — murni Python tanpa Spark/Airflow hidup. Petakan spec Langkah 44–45 & isi `read_fn`/`write_fn`.
