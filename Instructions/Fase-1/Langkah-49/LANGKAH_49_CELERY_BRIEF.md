# Brief Agen Cursor — Langkah 49: Migrasi Async ke Celery

> **Cara pakai:** lampirkan file ini ke agen Cursor di repo PSD, lalu mulai dengan:
> *"Kerjakan Langkah 49 sesuai brief terlampir. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuanmu, lalu tanyakan hal yang ambigu SEBELUM menulis kode."*
>
> Ini spesifikasi, bukan kode tempel. Sesuaikan ke kode PSD asli (job Langkah 38/40/45,
> pemakaian `BackgroundTasks`, konfigurasi Redis, struktur FastAPI & Docker).
> Tersedia **scaffold referensi lulus 6 uji** di `psd-celery/app/tasks/` — pakai sebagai
> cermin desain, bukan untuk disalin apa adanya (impl & status di sana masih stub).
>
> Bisa dikerjakan **paralel dengan Langkah 48** (tak ada ketergantungan silang).

---

## 1. Tujuan & mengapa ini pengerasan

Pindahkan tiga job dari FastAPI `BackgroundTasks` ke **Celery + worker terpisah**:
`run_synthesis_job` (Langkah 38), `run_room_data_job` (40), `run_pipeline_job` (45).

Tanpa ini, eksekusi DuckDB/AI menumpang proses API → saat beban naik, API ikut tumbang.
Worker terpisah memindahkan kerja berat keluar dari jalur request, dan **pemisahan antrian
AI vs Pabrik Data** mencegah satu beban menyumbat yang lain.

---

## 2. Keputusan desain (sudah dikunci — jangan diubah tanpa alasan kuat)

1. **Broker & result = Redis** (sudah ada). Pakai **DB Redis terpisah** untuk broker vs result.
2. **Dua antrian**: `ai` (sintesis + AI lain nanti) dan `pabrik_data` (room_data + pipeline).
   **Dua worker terpisah**, dijalankan dengan `-Q ai` dan `-Q pabrik_data`.
3. **Keandalan job panjang**: `task_acks_late=True`, `task_reject_on_worker_lost=True`,
   `worker_prefetch_multiplier=1`, `result_expires` (jaga memori Redis).
4. **Serialisasi JSON saja** (JANGAN pickle).
5. **Retry pintar**: `RetryableError` (transien: jaringan, OpenAI 429/5xx, lock) → retry
   eksponensial + jitter, cap `max_retries`. `PermanentError` (validasi, **kuota/token habis**)
   → **TIDAK** di-retry (mencegah pemborosan token AI).
6. **Status job dipersistensi sendiri** (queued/started/retrying/success/failure) agar UI bisa
   polling — jangan andalkan result backend Celery untuk UX.
7. **Antarmuka job dipertahankan**: `(job_id, payload) -> dict`. Migrasi mengganti *mekanisme
   eksekusi*, bukan kontrak job.

---

## 3. Langkah 0 — Orientasi repo (WAJIB sebelum menulis kode)

Telusuri repo dan **laporkan**. Bila ada yang ambigu → **berhenti & tanya**.

- [ ] Lokasi & **tanda tangan asli** `run_synthesis_job` (38), `run_room_data_job` (40),
      `run_pipeline_job` (45). Apakah **async** (coroutine) atau sync? Argumen apa saja?
- [ ] Semua titik panggil `BackgroundTasks.add_task(...)` untuk ketiga job (daftar file & baris).
- [ ] Konfigurasi Redis PSD saat ini (URL, apakah dipakai bersama cache aplikasi?).
- [ ] Bagaimana **status/progress job** ditampilkan ke UI sekarang (polling? websocket? tabel jobs?).
- [ ] Apakah job menyentuh **DB**? Worker butuh **engine/sesi sendiri** (bukan sesi async per-request).
- [ ] Apakah job AI memakai **throttle token gamifikasi**? Di mana kuota dicek (saat enqueue / saat jalan)?
- [ ] DuckDB: berkas tunggal atau per-entitas? (Menentukan konkurensi worker `pabrik_data`.)
- [ ] Struktur Docker/compose & cara image backend dibangun (untuk menambah service worker).
- [ ] Stack monitoring eksisting (Prometheus/Grafana?) untuk integrasi metrik Celery.

**Pertanyaan yang umumnya perlu dijawab manusia:**
1. Cutover **bertahap** (feature flag: BackgroundTasks ↔ Celery) atau langsung ganti?
2. Konkurensi worker `pabrik_data` — apakah DuckDB single-writer memaksa `-c 1`?
3. Untuk job AI: retry pada 429 boleh, tapi apakah **token sudah terlanjur terpotong**? Pastikan
   retry tidak memotong token dua kali (idempotensi biaya).

---

## 4. Sub-langkah (sesuai roadmap)

### Sub-langkah 1 — Setup Celery + worker container
Buat modul `app/tasks/` (cermin scaffold referensi):
- **`celery_app.py`** — instance Celery, broker/result Redis dari env, dua `Queue` (`ai`,
  `pabrik_data`), `task_routes` per nama task, dan flag keandalan (§2 poin 3–4).
- **`seams.py`** — `RetryableError`/`PermanentError`, `run_maybe_async` (jembatan coroutine→sync),
  serta **seam**: `synthesis_impl`/`room_data_impl`/`pipeline_impl` (bungkus job asli) +
  `set_job_status`.
- **`base.py`** — `PSDTask`: `autoretry_for=(RetryableError,)`, `retry_backoff`, `retry_jitter`,
  `max_retries`, `acks_late`, dan `on_failure` → tandai status `failure`.
- **`runner.py`** — transisi status seragam (started/retrying/success) + logging terstruktur.
- **`tasks.py`** — tiga `@celery_app.task` dengan **nama** `psd.synthesis.run`, `psd.room_data.run`,
  `psd.pipeline.run` (nama menentukan antrian).
- **Worker container** — cermin `docker-compose.worker.yml`: `worker-ai` (`-Q ai -c 4`) dan
  `worker-pabrik` (`-Q pabrik_data -c 1`).

**Penting (DB di worker):** sediakan engine/sessionmaker khusus worker di seam impl. Jangan
pakai sesi async request-scoped FastAPI. Bila job asli async, jalankan via `run_maybe_async`.

### Sub-langkah 2 — Port ketiga job
- Pindahkan logika asli ke balik `*_impl` di `seams.py` (atau panggil fungsi asli dari sana).
- Ganti tiap `BackgroundTasks.add_task(run_*_job, job_id, payload)` dengan
  `enqueue_*` (lihat `dispatch.py`): set status `queued`, `apply_async`, balas `task_id`.
- Tambahkan/teruskan endpoint **status job** `GET /jobs/{job_id}` membaca `set_job_status`.
- Klasifikasikan error di dalam impl: bungkus transien jadi `RetryableError`, validasi/kuota
  jadi `PermanentError`.

### Sub-langkah 3 — Pisahkan antrian, pantau & retry
- Pastikan routing benar (uji: synthesis→`ai`, room_data/pipeline→`pabrik_data`).
- Pantau: Flower untuk dev; produksi → **celery-exporter → Prometheus → Grafana** (konsisten stack PSD).
- Verifikasi kebijakan retry/backoff dan jalur kegagalan permanen.

---

## 5. Seam integrasi (paling kritis)

| Seam | Fungsi | Tugas agen |
|---|---|---|
| **Job impl** | `synthesis_impl / room_data_impl / pipeline_impl(job_id, payload)->dict` | Bungkus job asli 38/40/45; pertahankan kontrak; angkat Retryable/Permanent yang tepat. |
| **Status** | `set_job_status(job_id, status, **extra)` | Tulis ke penyimpanan status PSD (tabel jobs / Redis) untuk polling UI. |
| **DB worker** | (di dalam impl) | Engine/sesi khusus worker, bukan sesi request FastAPI. |
| **Throttle token** | (di dalam synthesis_impl / saat enqueue) | Cek kuota gamifikasi; pastикан retry tak memotong token ganda. |

---

## 6. Daftar periksa keandalan (Definition of Done)

- [ ] Ketiga job jalan via Celery; **tak ada lagi** `BackgroundTasks.add_task` untuk job berat.
- [ ] Routing benar: synthesis→`ai`; room_data & pipeline→`pabrik_data`.
- [ ] `acks_late` + `reject_on_worker_lost` + `prefetch_multiplier=1` aktif; serializer `json`.
- [ ] RetryableError → retry backoff+jitter (cap `max_retries`); PermanentError → tidak retry.
- [ ] `result_expires` diset (memori Redis tak membengkak).
- [ ] Status job ter-persist & dapat di-polling UI (queued→started→[retrying]→success/failure).
- [ ] Worker pakai engine/sesi DB sendiri; job async dijembatani benar.
- [ ] Dua service worker terpisah di compose; konkurensi `pabrik_data` aman utk DuckDB.
- [ ] Uji (cermin `psd-celery/app/tasks/tests/test_tasks.py`) **hijau**.
- [ ] Pemantauan aktif (Flower/Prometheus).

---

## 7. Yang TIDAK dikerjakan di Langkah 49 (non-goals)

- Jalur eksekusi **Spark/Airflow** (itu Langkah 54) — Celery cukup untuk DuckDB/AI sekarang.
- Celery **beat**/penjadwalan berkala (tambah hanya bila ada job terjadwal).
- Autoscaling worker (boleh menyusul; mulai dari konkurensi tetap).
- Mengubah logika bisnis job 38/40/45 — hanya *mekanisme eksekusi* yang berpindah.

---

## 8. Gotcha (dari verifikasi scaffold referensi)

- **Paket `redis` (python) wajib** ter-install agar transport kombu Redis termuat — meski uji
  mode eager tak menyentuh broker.
- **Mode eager tidak melooping retry sampai tuntas** dan tidak memanggil `on_failure` otomatis;
  itu peran worker sungguhan. Karena itu, uji retry sebaiknya memverifikasi **kontrak**
  (RetryableError memicu `celery.exceptions.Retry`; PermanentError tidak) dan memanggil
  `on_failure` langsung — bukan mengandalkan eager mengeksekusi seluruh siklus.
- **Jembatan async**: bila impl PSD coroutine, jalankan via `asyncio.run(...)` di dalam task
  (`run_maybe_async`). Jangan pakai event loop FastAPI di worker.
- **DuckDB single-writer**: konkurensi worker `pabrik_data` rendah (`-c 1`) bila satu berkas DB,
  agar tak saling lock.
- **`acks_late`+retry ⇒ at-least-once**: buat job idempoten (atau jaga via status) supaya
  eksekusi ulang aman.
- **Token AI & retry**: jangan retry `PermanentError` kuota; untuk 429 transien, pastikan biaya
  token tidak terpotong dua kali saat retry.

---

## 9. Referensi terverifikasi

Scaffold `psd-celery/app/tasks/` **lulus 6 uji** (routing antrian, konfigurasi keandalan,
sukses sintesis, jalur retry terpasang, permanen tak di-retry + tandai gagal, room_data jalan)
pada Celery 5.6.3. Pakai sebagai cermin; isi `*_impl`, `set_job_status`, dan sesi DB worker
dengan kode PSD asli.
