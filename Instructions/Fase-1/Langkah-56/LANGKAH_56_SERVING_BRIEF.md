# Brief Agen Cursor — Langkah 56: Hosting/Serving Model 🔴

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 56 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bersandar pada registry+monitoring Langkah 55, tier Langkah 52, Celery 49.
> Scaffold referensi **lulus 9 uji** di `psd-serving/`.
>
> ⚠️ **Item 🔴 — bagian TERBERAT MLOps, praktis produk tersendiri.**
> 🤔 **PERTIMBANGKAN DULU**: apakah serving terkelola benar dibutuhkan untuk konteks edukasi sebelum
> investasi besar? Bila belum, siapkan kerangka & tunda implementasi penuh.

---

## 1. Tujuan & batasan

Layani inferensi terkelola: endpoint per model (dari registry), autoscaling, kuota per tier, dan
pemantauan otomatis (latensi/drift/trigger retraining).

**Prasyarat MUTLAK:** Langkah 55 (registry+monitoring stabil). Jangan sebelum 55.

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Model dimuat dari registry MLflow** (`models:/{name}/{stage}`), di-cache; invalidasi saat promote.
2. **Kuota inferensi per tier gamifikasi** = rem biaya (konsisten strategi PSD). Store: **Redis** (produksi).
3. **Autoscaling via autoscaler eksternal** (HPA/KServe); PSD hanya menyediakan kebijakan `desired_replicas`.
   **CPU-only** (sesuai strategi).
4. **Pemantauan memakai ulang tabel gold Langkah 55** (`monitoring_model_metrics`) — satu dashboard untuk
   registry+drift+serving.
5. **Trigger retraining** dari status drift berjendela (Langkah 55): N jendela 'significant' berturut → picu.
6. **Edu-first**: pilih runtime serving paling ramping yang cukup; jangan over-engineer.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] Langkah 55: registry MLflow + tabel gold monitoring sudah stabil? Cara ambil versi aktif per stage.
- [ ] Tier gamifikasi (Langkah 52): sumber tier pengguna untuk kuota.
- [ ] Redis (Langkah 49): dipakai untuk store kuota jendela.
- [ ] Infra serving: Docker replicas / Kubernetes (HPA) / KServe / BentoML? Atau service FastAPI bespoke?
- [ ] Format model di registry (pyfunc/sklearn/dll.) & skema input/output untuk validasi.
- [ ] Pipeline retraining: ada job yang bisa dipicu (Langkah 49)?

**Pertanyaan untuk manусia:**
1. **Apakah serving benar dibutuhkan untuk pilot edukasi sekarang?** (Bila tidak → kerangka + tunda.)
2. Runtime: FastAPI bespoke (ringan) atau KServe/BentoML (terkelola, berat)?
3. Jatah kuota tiap tier & ukuran jendela (default 100/500/2000 per jam)?
4. Ambang trigger retraining (default 3 jendela 'significant' berturut)?

---

## 4. Sub-langkah (kerangka — akan pecah)

### 56.1 — Endpoint inferensi per model
- Cermin `loader.py` (muat dari registry, cache), `service.py` (predict + latensi + log),
  `endpoint.py` (`POST /api/models/{name}/predict`).
- Validasi skema input/output sesuai model.

### 56.2 — Autoscaling & kuota per tier
- Kuota: cermin `quota.py` (Redis di produksi; `InMemoryWindowStore` untuk dev). 429 bila habis.
- Autoscaling: kebijakan `scaling.desired_replicas` → umpan ke HPA/autoscaler eksternal.

### 56.3 — Pemantauan otomatis
- Latensi: `monitoring_hook.make_latency_logger` → tulis baris ke tabel gold Langkah 55.
- Drift: alirkan data inferensi ke job drift Langkah 55.
- Retraining: `scaling.should_retrain` atas status drift berjendela → `seams.trigger_retrain`.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| `load_model(uri)` | `mlflow.pyfunc.load_model` (atau flavor sesuai). |
| `user_id`/`user_tier(user)` | Identitas & tier (Langkah 52) untuk kuota. |
| `write_monitoring_rows(rows)` | Tulis ke tabel gold (Langkah 55). |
| `trigger_retrain(model, reason)` | Picu pipeline retraining (Langkah 49). |
| Store kuota | Redis INCR+EXPIRE per jendela. |

---

## 6. Definition of Done

- [ ] Endpoint inferensi per model memuat dari registry & memprediksi.
- [ ] Kuota tier ditegakkan (429 saat habis); reset per jendela.
- [ ] Latensi tercatat ke tabel gold; dashboard menampilkannya.
- [ ] Kebijakan replicas tersedia & terhubung ke autoscaler.
- [ ] Trigger retraining bekerja atas drift berjendela.
- [ ] Uji (cermin `psd-serving/app/serving/tests/test_serving.py`) hijau.

---

## 7. Non-goals

- GPU/akselerator (CPU-only).
- A/B testing & canary lanjutan (boleh menyusul).
- Feature store penuh (di luar lingkup).
- Membangun ulang yang sudah ada di KServe/BentoML bila salah satunya dipilih.

---

## 8. Gotcha (dari verifikasi scaffold)

- **Cache model + invalidasi**: muat sekali per (name, stage); **invalidate saat promote** versi baru
  (Langkah 55), jika tidak endpoint menyajikan model lama.
- **Kuota rollback**: saat melewati batas, kembalikan hitungan agar tak menghukum ganda; pakai store
  atomik (Redis) di produksi.
- **Latensi diukur di sekitar predict saja**; gunakan `perf_counter`, catat ke gold via worker bila berat.
- **Trigger retraining harus idempoten/ber-debounce** agar tak memicu berkali-kali pada drift berlarut.
- **Serving ≠ registry/monitoring**: jangan duplikasi logika Langkah 55; pakai ulang tabel gold & drift.
- **Pertimbangkan menunda**: bila edukasi belum perlu serving terkelola, kerangka cukup; hindari biaya infra.

---

## 9. Referensi terverifikasi

`psd-serving/` **lulus 9 uji** (cache loader + invalidasi, latensi+log, batas kuota per tier,
429 saat habis, reset jendela, batas replicas, trigger retraining berturut, baris latensi, endpoint
sukses+429) — murni Python + FastAPI TestClient. Isi seam dengan MLflow, tier, Redis, & pipeline PSD.
