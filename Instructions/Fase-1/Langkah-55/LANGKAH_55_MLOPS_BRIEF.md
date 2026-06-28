# Brief Agen Cursor — Langkah 55: Registry & Monitoring Model 🟡

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 55 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Memakai ulang Ruang Analitik (Langkah 46) + MLflow + Celery (49).
> Scaffold referensi **lulus 10 uji** di `psd-mlops/`.

---

## 1. Tujuan

"Base MLOps" yang konsisten: daftarkan model (registry) + pantau drift, **memakai ulang Ruang Analitik**
untuk dashboard. **Serving menyusul terpisah (Langkah 56)** — jangan dicampur di sini.

**Prasyarat:** Langkah 46 (dashboard/skema gold) + MLflow.

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Registry = MLflow** (service tipis di atas `MlflowClient`). Model dari ruang/kompetisi → versi + tag + stage.
2. **Drift via PSI & KS**: PSI numerik/kategorik (ambang <0.1 stabil, 0.1–0.25 sedang, >0.25 signifikan)
   + KS numerik. Hasil → **tabel gold monitoring**.
3. **Dashboard monitoring memakai ulang Ruang Analitik (Langkah 46)** membaca tabel gold — bukan UI baru.
4. **Job drift via Celery** (Langkah 49, antrian `pabrik_data`); drift signifikan → alert (opsional Langkah 29).
5. Serving (endpoint inferensi, autoscaling) **bukan** di sini — itu Langkah 56.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] MLflow: tracking/registry URI; sudah ada di Insightera? Cara model dari ruang/kompetisi disimpan (run_id, artifact_path).
- [ ] Skema gold (Langkah 46): di mana menulis tabel `monitoring_model_metrics`; konvensi penamaan.
- [ ] Sumber **distribusi acuan** (baseline/training) vs **terkini** (inferensi) per fitur model.
- [ ] Daftar fitur tiap model + tipenya (numeric/categorical) untuk drift.
- [ ] Celery Langkah 49: cara menjadwalkan job drift berkala (beat?) atau dipicu event.
- [ ] Ruang Analitik Langkah 46: cara menambah dashboard membaca tabel gold monitoring.

**Pertanyaan untuk manusia:**
1. Frekuensi hitung drift (harian/mingguan/saat batch inferensi)?
2. Ambang PSI kustom per model, atau pakai standar (0.1/0.25)?
3. Drift signifikan → hanya tampil di dashboard, atau juga kirim notifikasi (Langkah 29)?

---

## 4. Sub-langkah

### 55.1 — Registry MLflow
- Cermin `registry.py` (`RegistryService` atas `MlflowClient`): `ensure_registered_model`,
  `register_from_run` (versi dari `runs:/<run_id>/model` + tag), `promote` (stage).
- Tautkan ke alur ruang/kompetisi: saat model "diserahkan", daftarkan + versi + metrik.

### 55.2 — Job drift → gold
- Cermin `drift.py` (PSI/KS), `monitoring.py` (baris gold), `drift_job.py` (orkestrasi).
- Implementasi seam: muat acuan & terkini per fitur; tulis baris ke tabel gold.
- Jadwalkan via Celery; drift signifikan → alert opsional.

### 55.3 — Dashboard monitoring
- Buat dashboard Ruang Analitik (Langkah 46) membaca `monitoring_model_metrics`:
  drift per fitur (PSI/KS lintas waktu), akurasi, distribusi prediksi (via `metric_row`).

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| `load_reference/current(model, version, feature)` | Sumber distribusi acuan & terkini. |
| `write_monitoring_rows(rows)` | Tulis ke tabel gold (Langkah 46/Pabrik Data). |
| `raise_alert(alert)` | (Opsional) notifikasi Langkah 29 untuk drift signifikan. |
| MLflow client | Sediakan `MlflowClient` ke `RegistryService`. |

---

## 6. Definition of Done

- [ ] Model dari ruang/kompetisi terdaftar di MLflow (versi + tag + stage).
- [ ] Job drift menghitung PSI (numerik & kategorik) + KS, menulis ke tabel gold.
- [ ] Status drift terklasifikasi (stabil/sedang/signifikan); signifikan → alert/dashboard.
- [ ] Dashboard monitoring (Ruang Analitik) menampilkan drift/akurasi/distribusi prediksi.
- [ ] Job berjalan via Celery (terjadwal/terpicu).
- [ ] Uji (cermin `psd-mlops/app/mlops/tests/test_mlops.py`) hijau.

---

## 7. Non-goals

- **Serving/hosting model** → Langkah 56 (terpisah; jangan di sini).
- Retraining otomatis & trigger drift→retrain (boleh menyusul setelah serving).
- Deteksi drift lanjutan (multivariat, concept drift berlabel) di luar PSI/KS dasar.

---

## 8. Gotcha (dari verifikasi scaffold)

- **PSI butuh penanganan bin kosong** (epsilon) agar `log` tak meledak; edges kuantil dari acuan.
- **Numerik vs kategorik**: pilih PSI yang tepat per fitur; KS hanya untuk numerik.
- **Tabel gold konsisten** (`monitoring_model_metrics`) agar satu dashboard melayani semua model;
  metrik level-model pakai `feature='__model__'`.
- **Registry idempoten**: `create_registered_model` bisa gagal bila sudah ada → tangkap & lanjut.
- **Untuk skala besar**, ganti PSI/KS pure-Python dengan numpy/scipy (antarmuka tetap); jangan hitung
  drift di proses API — jalankan di worker Celery.
- **Source versi MLflow** = `runs:/<run_id>/<artifact_path>` (default `model`).

---

## 9. Referensi terverifikasi

`psd-mlops/` **lulus 10 uji** (PSI stabil/signifikan, PSI kategorik, KS 0↔1, klasifikasi ambang,
baris monitoring + alert, registry register/promote + idempoten, job drift end-to-end numerik+kategorik).
Isi seam dengan sumber data & sink gold PSD; sambungkan `MlflowClient` asli.
