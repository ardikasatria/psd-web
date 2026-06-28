# Brief Agen Cursor — Notebook Terintegrasi (gaya Kaggle): Hybrid + Gamifikasi

> **Revisi/perluasan Langkah 52.** Mengubah pengalaman "buka JupyterHub" menjadi **notebook
> tertanam di dalam PSD** (tanpa UI Hub), dengan **runtime hybrid** dan **kuota per tier**.
>
> **Cara pakai:** lampirkan ke agen Cursor, mulai dengan:
> *"Kerjakan notebook terintegrasi sesuai brief. Mulai dari Langkah 0 — Orientasi repo,
> laporkan temuan, tanyakan yang ambigu SEBELUM menulis kode."*
>
> Scaffold referensi **lulus 11 uji** di `psd-notebook/`.

---

## 1. Tujuan

Pengalaman notebook **seperti Kaggle**: pengguna membuat/menjalankan notebook **langsung di UI PSD**,
tanpa membuka JupyterHub. **Dibatasi jumlah notebook & kernel** sesuai **tier gamifikasi**.

---

## 2. Keputusan desain (dikunci) — arsitektur HYBRID

**Dua runtime, dipilih per tier (rem biaya):**

| Runtime | Mesin | Biaya server | Untuk |
|---|---|---|---|
| **browser** | **JupyterLite + Pyodide** (jalan di browser) | **~nol** | Tier rendah & kerja ringan |
| **server** | **Kernel server** (Jupyter Server/Kernel Gateway, kontainer per-pengguna) | tinggi → di-gate | Tier lebih tinggi & compute nyata |

1. **Tier rendah (pemula) → browser-only** (JupyterLite). Gratis, instan, tanpa kernel server.
2. **Tier lebih tinggi → buka kernel server**, di-gate **kuota kernel konkuren**.
3. **Kuota jumlah notebook & kernel konkuren per tier** (jawaban "dibatasi berapa notebook").
4. **UI tertanam di PSD** — JupyterHub UI disembunyikan. Dua opsi embed (pilih satu, §4.2).
5. **CPU-only** (tanpa GPU) — konsisten strategi.
6. **Jujur soal isolasi**: kernel **server** tetap butuh **kontainer per-pengguna** untuk keamanan
   (boleh tetap via spawner di belakang layar). Yang hilang hanyalah **UI Hub**, bukan isolasi.

**Batas default (sesuaikan ke kapasitas infra):**
- pemula: 3 notebook · 1 kernel · runtime browser · 1 CPU / 2 GB
- menengah: 10 notebook · 2 kernel · browser+server · 2 CPU / 4 GB
- lanjut: 50 notebook · 4 kernel · browser+server · 4 CPU / 8 GB

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telусури & laporkan; ambigu → berhenti & tanya.

- [ ] Status Langkah 52: apakah JupyterHub sudah ada? Akan dipertahankan (sebagai spawner kernel server
      di belakang) atau diganti penyedia kernel lain (Kernel Gateway)?
- [ ] Tier gamifikasi (Langkah 52): sumber tier pengguna.
- [ ] Penyimpanan **notebook** (.ipynb) di PSD: di DB/objek? (untuk runtime browser, konten disimpan PSD).
- [ ] Cara hitung **kernel berjalan** per pengguna (untuk kuota konkuren).
- [ ] Frontend: kerangka untuk embed (iframe JupyterLab vs UI kustom `@jupyterlab/services`).
- [ ] **CORS MinIO**: apakah browser boleh mengambil presigned URL (untuk SDK `psd-lite`)?
- [ ] SDK `psd://` (Langkah 52) — perlu varian **browser** (`psd-lite`) yang fetch presigned URL.

**Pertanyaan untuk manусia:**
1. Angka kuota tiap tier (notebook/kernel/CPU/RAM) sesuai kapasitas?
2. Embed: **iframe JupyterLab** (cepat) atau **UI notebook kustom** (paling "Kaggle", lebih berat)?
3. Tier 'both' default ke server atau browser? (Scaffold default **server**; ubah ke browser bila ingin
   hemat biaya maksimal.)
4. Apakah pemula benar browser-only, atau beri 1 kernel server berdurasi pendek?

---

## 4. Sub-langkah

### N.1 — Kuota & runtime (gamifikasi)
- Cermin `policy.py` (batas per tier), `runtime.py` (pemilih), `service.py` (`create_notebook` gated,
  `launch`). Sambungkan seam tier/store/kernel-count.

### N.2 — Runtime browser (JupyterLite)
- Sajikan **JupyterLite** sebagai aset statis dari app PSD (build sekali). Cermin `jupyterlite.py`
  (paket Pyodide, config).
- **SDK `psd-lite`** (browser): `psd.load("psd://...")` → minta presigned URL ke API PSD → fetch
  (butuh **CORS** ke MinIO). Simpan notebook ke PSD via API (autosave).

### N.3 — Runtime server (kernel)
- Cermin `kernels.py` (KernelClient REST: start/list/interrupt/restart/shutdown) + `start_kernel_gated`.
- Kernel server = **kontainer per-pengguna** (spawner Hub di belakang atau Kernel Gateway terisolasi).
- Eksekusi sel via **WebSocket** `/api/kernels/{id}/channels` (protokol Jupyter) dari frontend.
- Idle-culling + batas tier (Langkah 52) tetap berlaku.

### N.4 — UI tertanam (pilih satu)
- **Opsi A (cepat):** embed **JupyterLab** (mode single-document) dalam iframe ber-tema PSD.
- **Opsi B (Kaggle-like):** UI notebook kustom memakai `@jupyterlab/services` (ServiceManager) →
  render sel, jalankan via WS. Lebih banyak kerja, paling mulus.

### N.5 — Endpoint
- `POST /api/notebooks` (gated kuota), `GET /api/notebooks`, `DELETE`, `PUT .../content`.
- `POST /api/notebooks/{id}/launch` → `service.launch` → kembalikan config browser **atau** kernel server.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| `user_tier(user_id)` | Tier gamifikasi (Langkah 52). |
| `NotebookStore` | Simpan/hitung notebook PSD (konten .ipynb). |
| `running_kernel_count(user_id)` | Untuk kuota kernel konkuren. |
| `get_kernel_client()` | KernelClient ke Jupyter Server/Gateway pengguna. |
| SDK `psd-lite` | Varian browser SDK (fetch presigned URL). |

---

## 6. Definition of Done

- [ ] Pengguna membuat & menjalankan notebook **di dalam PSD**, tanpa membuka UI JupyterHub.
- [ ] **Kuota per tier ditegakkan**: jumlah notebook (create diblok saat penuh) & kernel konkuren.
- [ ] Tier rendah jalan di **browser (JupyterLite)** tanpa kernel server; tier tinggi buka kernel server.
- [ ] SDK `psd-lite` mengakses dataset via presigned URL (CORS benar).
- [ ] Kernel server terisolasi per-pengguna; idle-culling aktif; CPU-only.
- [ ] Uji (cermin `psd-notebook/app/notebook/tests/test_notebook.py`) hijau.

---

## 7. Non-goals

- GPU/akselerator.
- Paritas paket penuh di browser (Pyodide terbatas; paket berat → runtime server).
- Kolaborasi real-time multi-kursor (menyusul bila perlu).
- Membangun ulang editor notebook dari nol bila Opsi A (iframe) sudah cukup.

---

## 8. Gotcha (dari verifikasi scaffold)

- **"Tanpa Hub UI" ≠ "tanpa kontainer per-pengguna"**: untuk kernel server, isolasi tetap perlu
  (spawner/kontainer). Jangan jalankan kernel banyak-pengguna dalam satu proses (risiko keamanan).
- **JupyterLite ≠ server**: tak semua paket/akses tersedia di browser; arahkan kerja berat ke server.
- **CORS MinIO**: SDK browser ambil presigned URL → MinIO harus mengizinkan origin PSD, atau proxy lewat API PSD.
- **Kuota dua lapis**: batasi **jumlah notebook** (saat create) DAN **kernel konkuren** (saat launch server).
- **Eksekusi via WebSocket**: lifecycle kernel via REST (modul ini), tetapi run-sel via WS — siapkan
  proxy/auth WS.
- **Default 'both'**: scaffold default ke server; untuk hemat biaya maksimal, default-kan ke browser.

---

## 9. Referensi terverifikasi

`psd-notebook/` **lulus 11 uji** (kuota notebook & kernel konkuren per tier, CPU-only, runtime hybrid
[pemula→browser, server ditolak; menengah/lanjut default server & boleh pilih], create gated,
KernelClient start/shutdown, start_kernel_gated, launch browser/server + blok saat kuota habis).
Isi seam dengan tier/store/kernel PSD; sediakan JupyterLite (aset statis) & SDK `psd-lite`.
