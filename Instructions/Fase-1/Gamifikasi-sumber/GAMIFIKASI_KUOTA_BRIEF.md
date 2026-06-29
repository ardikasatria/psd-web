# Brief Agen Cursor — Gamifikasi & Kuota (Sumber Kebenaran Tunggal)

> **Cara pakai:** lampirkan ke agen Cursor, mulai dengan:
> *"Kerjakan modul gamifikasi & kuota terpusat sesuai brief. Mulai dari Langkah 0 — Orientasi repo,
> laporкан temuan, lalu REFACTOR fitur lain agar memakai modul ini."*
>
> Scaffold referensi **lulus 10 uji** di `psd-gamification/`.
>
> 🎯 **Mengapa ini perlu:** brief 52/52b/56/57 masing-masing mendefinisikan tabel tier→kuota
> SENDIRI-SENDIRI (nama tier sama, angka beda). Ini **menyatukannya** jadi satu modul agar tak melenceng.

---

## 1. Tujuan

Satu modul rujukan untuk: **definisi tier**, **perolehan poin → tier**, dan **matriks kuota per fitur**.
Semua fitur (notebook 52b, JupyterHub 52, serving 56, AI asisten 57) **memanggil modul ini**, bukan
menulis angka sendiri.

**Prasyarat:** pelacakan aktivitas Langkah 35 (sumber poin) — mungkin sudah ada di Fase 0.

---

## 2. Keputusan desain (dikunci)

1. **Tier kanonik** (`tiers.py`): pemula/menengah/lanjut dengan **ambang poin**. Satu daftar, satu tempat.
2. **Poin dari aktivitas** (`points.py`): peristiwa (Langkah 35) → poin → total → tier.
3. **Matriks kuota terpusat** (`quota.py`): `quota(feature_key, tier)`. Tak ada angka kuota di luar sini.
4. **`user_tier()` satu pintu** (`seams.py`): fitur lain memanggil ini, tak menghitung tier sendiri.
5. **Pengecek generik berjendela** (`check_and_consume`) dipakai ulang untuk kuota berlaju (AI, inferensi).
6. **Validasi kelengkapan**: `validate_matrix()` memastikan tiap fitur mencakup semua tier.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telусури & laporkan; ambigu → berhenti & tanya.

- [ ] **Apakah mesin gamifikasi sudah ada di Fase 0?** Bagaimana poin disimpan & tier dihitung?
      - Bila SUDAH: modul ini jadi **registry tier+kuota terpusat**; `seams.user_tier` membungkus
        penentuan tier yang ada (jangan menduplikasi).
      - Bila BELUM: implementasikan perolehan poin (`points.py`) + simpan poin per pengguna +
        hitung tier (`tier_for_points`).
- [ ] Lokasi tabel tier/kuota yang TERSEBAR saat ini (52/52b/56/57) untuk **di-refactor** ke modul ini.
- [ ] Sumber peristiwa poin (Langkah 35): nama peristiwa nyata untuk dipetakan di `points.py`.
- [ ] Redis untuk store kuota berjendela.

**Pertanyaan untuk manусia:**
1. **Ambang poin tiap tier** & **poin tiap aktivitas** — angka final?
2. Berapa tier? (Scaffold: 3 — pemula/menengah/lanjut. Tambah bila perlu.)
3. Nilai kuota final tiap (fitur, tier) untuk mengisi matriks?
4. Apakah Fase 0 menyimpan **poin** atau langsung **tier**? (Menentukan `seams.user_tier`.)

---

## 4. Sub-langkah

### G.1 — Modul terpusat
- Cermin `tiers.py` (+ ambang), `points.py` (+ peristiwa nyata), `quota.py` (+ matriks final), `seams.py`.
- Jalankan `validate_matrix()` di startup/CI agar tak ada tier yang terlewat.

### G.2 — Integrasi poin (bila belum ada)
- Hubungkan peristiwa Langkah 35 → `points.award` → akumulasi poin per pengguna → simpan.
- (Opsional) tampilkan progres tier & "kurang N poin untuk naik" (`points_to_next`) di UI/feed (Langkah 57).

### G.3 — REFACTOR fitur agar memakai modul ini (PENTING)
Ganti tabel lokal dengan panggilan terpusat:
- **52 JupyterHub**: `jupyter.cpu/mem_gb/idle_minutes` dari `quota(...)`.
- **52b Notebook**: `notebook.max_notebooks/max_concurrent_kernels/runtime` dari `quota(...)`.
- **56 Serving**: `inference.per_hour` via `check_and_consume`.
- **57 AI Asisten**: `ai.messages_per_day` via `check_and_consume`.
- Semua resolusi tier lewat `seams.user_tier`.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| `user_points(user_id)` | Total poin (penyimpanan gamifikasi/Fase 0). |
| `user_tier(user_id)` | **Satu pintu** penentuan tier (poin→tier atau tier tersimpan). |
| `get_quota_store()` | Store kuota berjendela (Redis). |
| Peristiwa poin | Petakan peristiwa Langkah 35 → `points.POINTS`. |

---

## 6. Definition of Done

- [ ] Satu modul mendefinisikan tier, poin, dan matriks kuota; `validate_matrix()` bersih.
- [ ] `seams.user_tier` jadi satu-satunya jalur penentuan tier.
- [ ] **52/52b/56/57 di-refactor** memakai modul ini (tak ada angka kuota duplikat).
- [ ] Progres tier (poin→tier, kurang berapa) tampil bila relevan.
- [ ] Uji (cermin `psd-gamification/app/gamification/tests/test_gamification.py`) hijau.

---

## 7. Non-goals

- Lencana/leaderboard kompleks (boleh menyusul; ini fondasi tier+kuota).
- Anti-abuse poin lanjutan (deteksi kecurangan) — fase berikut.

---

## 8. Gotcha

- **Satu sumber kebenaran**: bila menemukan angka tier/kuota di luar modul ini, itu duplikasi → pindahkan.
- **Tier dari poin, bukan ditebak**: konsisten via `tier_for_points`.
- **Matriks lengkap**: tiap fitur harus mencakup semua tier (`validate_matrix`), agar tak ada
  pengguna tanpa kuota terdefinisi.
- **`check_and_consume` hanya untuk kuota numerik** (laju); nilai non-numerik (runtime) dibaca via `quota()`.
- **Jangan duplikasi mesin gamifikasi** bila Fase 0 sudah punya — bungkus saja lewat `seams.user_tier`.

---

## 9. Referensi terverifikasi

`psd-gamification/` **lulus 10 uji** (ambang poin→tier, tier berikutnya & sisa poin, perolehan poin &
total, progresi tier, lookup matriks per tier, fallback tier tak dikenal, kelengkapan matriks,
`check_and_consume` menegakkan batas, tolak non-numerik, tier tinggi kuota lebih besar).
Isi ambang/poin/kuota final; refactor 52/52b/56/57 agar memakai modul ini.
