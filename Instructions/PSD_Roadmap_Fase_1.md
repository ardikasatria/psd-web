# PSD — Roadmap Fase 1 (Langkah 48→60)

> Dokumen perencanaan Fase 1, dikerjakan **setelah** pilot Fase 0 (Langkah 0–47) berjalan. Disusun berdasarkan **urutan ketergantungan**, bukan abjad. Tiap item mencantumkan: tujuan, prasyarat, sub-langkah, estimasi kompleksitas, dan catatan jujur. Acuan: Cetak Biru Git/JupyterHub & Pabrik Data.

## Legenda kompleksitas
- 🟢 **Kecil** — satu langkah seperti biasa (backend + frontend pasangan).
- 🟡 **Sedang** — 2–3 sub-langkah.
- 🔴 **Berat** — sistem infrastruktur penuh; pecah jadi beberapa sub-langkah (seperti Ruang Ide dulu jadi 4).

## Peta ketergantungan (ringkas)

```
48 OAuth Provider ──┬─▶ 50 Gitea ──▶ 51 Pull Request
                    ├─▶ 52 JupyterHub
                    └─▶ 53 Superset Embed
49 Celery (paralel, pengerasan)
46 Ruang Analitik ──▶ 53 Superset, 55 Monitoring
55 Registry+Monitoring ──▶ 56 Serving
35 Pelacakan ──▶ 57 AI Asisten
(reaktif) 58 Cache & performa
```

---

# TEMA A — Fondasi & Pengerasan (kerjakan lebih dulu)

## Langkah 48 — OAuth Provider PSD 🟡
**Tujuan:** Menjadikan PSD penyedia identitas OAuth2 — satu login untuk Gitea, JupyterHub, Superset. Membuat "login otomatis" jadi nyata & aman.
**Prasyarat:** Auth (Langkah 14, cookie httpOnly).
**Sub-langkah:**
1. Endpoint OAuth2 (authorize, token, userinfo) + registrasi klien internal.
2. Manajemen consent & scope (read profil, repo, dsb).
3. Uji dengan satu konsumen percobaan.
**Catatan jujur:** Wajib pertama. Mengerjakan Gitea/Hub/Superset tanpa ini = tiga sistem identitas terpisah yang nanti dibongkar.

## Langkah 49 — Migrasi Async ke Celery 🟡
**Tujuan:** Pindahkan semua job dari `BackgroundTasks` ke Celery + worker terpisah.
**Prasyarat:** Redis (ada); job di Langkah 38, 40, 45.
**Sub-langkah:**
1. Setup Celery (broker/result via Redis), worker container.
2. Port `run_synthesis_job` (38), `run_room_data_job` (40), `run_pipeline_job` (45) — antarmuka sudah disiapkan sama.
3. Pisahkan antrian AI vs Pabrik Data; pantau & retry.
**Catatan jujur:** Pengerasan produksi. Tanpa ini, eksekusi DuckDB/AI membebani proses API saat beban naik. Bisa paralel dengan 48.

---

# TEMA B — Kemandirian Infrastruktur

## Langkah 50 — Integrasi Git (Gitea) 🔴
**Tujuan:** Versioning repo nyata (clone/push/branch/riwayat/LFS) menggantikan unggah file datar.
**Prasyarat:** 48 (OAuth), storage (15).
**Sub-langkah:**
1. Deploy Gitea (container + DB); konfigurasi LFS.
2. Buat repo padanan via Gitea API saat repo PSD dibuat; simpan `clone_url`/`gitea_repo_id`.
3. Jembatan auth: OAuth PSD → Gitea (GenericOAuth) atau token per-repo.
4. Migrasi repo lama: impor `files[]` jadi commit awal (skrip satu kali), dual-write, lalu pindah source of truth.
5. Tampilan: daftar file/diff sederhana via Gitea API.
**Catatan jujur:** Perubahan besar pada model penyimpanan repo — bukan penyempurnaan. Lakukan non-destruktif & bertahap.

## Langkah 51 — Pull Request & Kontribusi 🟡
**Tujuan:** Alur kontribusi ala GitHub/HF: fork, branch, PR, review.
**Prasyarat:** 50 (git nyata) — **mutlak**.
**Sub-langkah:**
1. Fork/branch via Gitea API; UI buat PR.
2. Review (komentar, approve), merge.
3. Notifikasi (Langkah 29) untuk PR/review.
**Catatan jujur:** Tak mungkin sebelum 50. Inilah pembeda "platform aset" → "platform kolaborasi".

## Langkah 52 — JupyterHub 🔴
**Tujuan:** Notebook mandiri di dalam PSD (ganti tautan Colab Langkah 22).
**Prasyarat:** 48 (OAuth), storage (MinIO).
**Sub-langkah:**
1. Deploy JupyterHub + DockerSpawner (KubeSpawner bila K8s).
2. Autentikasi via OAuth PSD (GenericOAuthenticator).
3. Batas CPU/RAM/timeout per tier gamifikasi + idle-culling.
4. Image DS pra-bangun + PSD SDK (akses dataset via URI `psd://`).
5. Integrasi: buka notebook tim dari Ruang Ide; mount dataset MinIO.
**Catatan jujur:** Berat secara ops. **CPU-only, tanpa GPU** (sesuai strategi — jangan kejar paritas compute Kaggle). Idle-culling + batas tier adalah rem biaya utama. Pertahankan Colab sebagai fallback selama transisi.

---

# TEMA C — Analitik & BI Lanjutan

## Langkah 53 — Superset Embed 🔴
**Tujuan:** Self-serve BI penuh sebagai peningkatan Ruang Analitik.
**Prasyarat:** 48 (OAuth), 46 (skema gold stabil).
**Sub-langkah:**
1. Deploy Superset (metadata DB + cache).
2. Sambungkan ke skema gold (DuckDB/Postgres); provision dataset otomatis via REST API saat pengguna "promote" dashboard.
3. Embed via Embedded SDK + guest token; row-level security per tim.
**Catatan jujur:** Bukan jalan pintas — embedding + provisioning + RLS itu proyek. Benar ditunda ke sini, bukan menunda-nunda. Dashboard native (Langkah 46) tetap jalan untuk kebutuhan ringan.

## Langkah 54 — Jalur Eksekusi Spark/Airflow 🔴 (opsional)
**Tujuan:** Pipeline skala besar di luar kemampuan DuckDB.
**Prasyarat:** 44–45 (spec DAG & engine), 49 (Celery/orkestrasi).
**Sub-langkah:**
1. Backend eksekusi Spark (terjemahkan DAG yang sama → Spark).
2. Orkestrasi Airflow untuk pipeline terjadwal.
3. Pemilih engine per pipeline (DuckDB vs Spark).
**Catatan jujur:** Kanvas & spec **tidak berubah** — hanya backend eksekusi ditukar. Hanya perlu bila ada data benar-benar besar; untuk pengajaran, DuckDB cukup. Bisa ditunda hingga ada kebutuhan nyata.

---

# TEMA D — MLOps

## Langkah 55 — Registry & Monitoring Model 🟡
**Tujuan:** Daftarkan model + pantau drift, memakai ulang Ruang Analitik.
**Prasyarat:** 46 (dashboard), MLflow.
**Sub-langkah:**
1. Registry MLflow: model dari ruang/kompetisi + versi + metrik.
2. Job Pabrik Data penghitung drift → tabel gold monitoring.
3. Dashboard monitoring (drift/akurasi/distribusi prediksi).
**Catatan jujur:** Ini "base MLOps" yang konsisten; serving menyusul terpisah.

## Langkah 56 — Hosting/Serving Model 🔴
**Tujuan:** Layani inferensi terkelola + autoscaling + pemantauan otomatis.
**Prasyarat:** 55 (registry+monitoring stabil).
**Sub-langkah:**
1. Endpoint inferensi per model (dari registry).
2. Autoscaling & kuota per tier.
3. Pemantauan otomatis (latensi, drift, retraining trigger).
**Catatan jujur:** Bagian terberat MLOps — praktis produk tersendiri. Jangan sebelum 55. Pertimbangkan apakah benar dibutuhkan untuk konteks edukasi sebelum investasi besar.

---

# TEMA E — Kecerdasan Platform

## Langkah 57 — AI Asisten & Rekomendasi (#9) 🟡
**Tujuan:** Rekomendasi personal (dataset/course/kompetisi/ruang) + asisten dalam-platform.
**Prasyarat:** 35 (data pelacakan aktivitas) + OpenAI.
**Sub-langkah:**
1. Rekomendasi berbasis afinitas kategori/tag (dari `activity-summary` Langkah 35).
2. Asisten kontekstual (jawab pertanyaan, arahkan ke fitur) dengan kuota per tier.
3. Personalisasi feed & "langkah berikutnya".
**Catatan jujur:** Ditaruh akhir karena baru bernilai setelah ada cukup pengguna aktif. Membangun terlalu dini = rekomendasi kosong/buruk. Tetap gated kuota gamifikasi (rem biaya AI).

---

# TEMA F — Optimasi (reaktif, bukan terjadwal)

## Langkah 58 — Cache & Performa 🟢
**Tujuan:** Percepat titik yang terbukti lambat.
**Sub-langkah (saat dibutuhkan):**
1. Cache widget per `(run_id, widget)` di Redis (Langkah 46).
2. Cache introspeksi skema (Langkah 47).
3. Optimasi query/index sesuai profil beban nyata.
**Catatan jujur:** Kerjakan **reaktif** — saat ada bukti lambat, bukan prematur. Optimasi dini membuang waktu.

---

# TEMA G — Email (lintas-fase, wajib go-live)

## Langkah 59 — Email Notifikasi (Resend SMTP) 🟡
**Tujuan:** Channel email dari notifikasi Langkah 29 — async Celery, preferensi immediate/digest/off, unsubscribe.
**Prasyarat:** 29 (notifikasi), 49 (Celery), Redis, domain Resend terverifikasi.
**Sub-langkah:**
1. Provider SMTP/HTTP Resend + template BI per peristiwa.
2. Hook `notify()` → enqueue antrian `email`; dedup Redis; digest harian (beat).
3. Preferensi pengguna + endpoint unsubscribe HMAC.
**Deploy:** `worker-email`, `celery-beat`, env `PSD_EMAIL_*`, `RESEND_API_KEY`.

## Langkah 60 — Email Auth (verify / reset) 🟢
**Tujuan:** Email transaksional auth elegan Bahasa Indonesia — verifikasi, reset kata sandi, ganti email.
**Prasyarat:** 14 (auth), 59 (provider SMTP).
**Sub-langkah:**
1. Template auth (`auth_templates.py`) + `send_*` di auth router.
2. UI `/check-email`, perbaikan forgot/reset/verify/security settings.
**Catatan jujur:** Wajib sebelum go-live pilot — tanpa email auth, alur daftar/reset terputus di produksi.

---

# Rekomendasi prioritas untuk pilot ITERA

Jangan kerjakan semua sekaligus. Saran fokus:

1. **48 + 49 + 59 + 60** dulu — fondasi identitas, Celery, **dan email auth/notifikasi**.
2. **52 JupyterHub** — nilai pedagogis langsung untuk mahasiswa (notebook mandiri).
3. **55 Registry+Monitoring** — bila kelas MLOps butuh.
4. Sisanya (**50–51 Git, 53 Superset, 54 Spark, 56 Serving, 57 AI**) **menyusul setelah umpan balik pilot** menunjukkan mana yang paling dibutuhkan — bukan berdasarkan tebakan.

**Deploy VM:** [PSD_FASE1_DEPLOY.md](./PSD_FASE1_DEPLOY.md) · [deploy/README.md](../deploy/README.md)

# Catatan menyeluruh (jujur)

- Empat item 🔴 (Gitea 50, JupyterHub 52, Superset 53, Serving 56) masing-masing adalah **sistem infrastruktur penuh**. Saat dikerjakan, tiap satunya akan pecah jadi beberapa sub-langkah nyata — perlakukan estimasi di sini sebagai kerangka, bukan ukuran pasti.
- **Urutan A → B/C/D → E itu mengikat** karena 48 (OAuth) & 49 (Celery) adalah prasyarat teknis.
- Fase 1 sebaiknya **didorong umpan balik pilot**, bukan diborong di muka. Bangun fondasi (A), satu fitur bernilai tinggi (JupyterHub), lalu biarkan kebutuhan nyata menentukan urutan sisanya.
