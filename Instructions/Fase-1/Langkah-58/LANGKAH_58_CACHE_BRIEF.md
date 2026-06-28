# Brief Agen Cursor — Langkah 58: Cache & Performa 🟢

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 58 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Memakai Redis + cache widget (Langkah 46) & skema (Langkah 47).
> Scaffold referensi **lulus 8 uji** di `psd-perf/`.
>
> 🛑 **REAKTIF, BUKAN PREMATUR.** Kerjakan **hanya saat ada BUKTI lambat**. "Optimasi dini membuang waktu."
> Urutan wajib: **UKUR → buktikan lambat → cache/optimasi → ukur lagi.**

---

## 1. Tujuan & filosofi

Percepat titik yang **terbukti** lambat — bukan menebak. Tiga sasaran umum: cache widget,
cache introspeksi skema, dan optimasi query/index sesuai profil beban nyata.

**Tidak ada prasyarat keras** selain fitur yang dioptimasi (46/47) sudah ada. Ini langkah penutup
yang dikerjakan sepanjang waktu secara reaktif.

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Ukur dulu**: pakai registri latensi + `should_cache` (butuh cukup sampel & p95 di atas ambang)
   sebelum menambah cache. Jangan cache yang belum terbukti lambat.
2. **Cache-aside + TTL** di Redis. Kunci deterministik; serialisasi JSON.
3. **Invalidasi eksplisit**: widget per run (`invalidate_run`), skema per source (`invalidate_schema`).
4. **TTL konservatif** + invalidasi saat sumber berubah (hindari data basi).
5. Optimasi query/index **berbasis profil** (slow-query nyata), bukan spekulatif.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telусуri & laporkan; ambigu → berhenti & tanya.

- [ ] **Bukti lambat**: apakah sudah ADA titik yang terukur lambat? (Bila belum → jangan kerjakan; pasang ukur dulu.)
- [ ] Widget Langkah 46: bentuk `(run_id, widget)` & kapan run berubah (untuk invalidasi).
- [ ] Introspeksi skema Langkah 47: source apa, seberapa sering berubah.
- [ ] Redis (Langkah 49): instans untuk cache (terpisah dari broker Celery bila perlu).
- [ ] Query/DB (DuckDB/Postgres gold): cara melihat query lambat (log/EXPLAIN).

**Pertanyaan untuk manусia:**
1. Ambang "lambat" (default p95 ≥ 200 ms) & sampel minimum (default 30)?
2. TTL widget & skema (default 1 jam / 10 menit)?
3. Konsistensi: berapa lama data basi ditoleransi vs invalidasi langsung?

---

## 4. Sub-langkah (kerjakan SAAT DIBUTUHKAN)

### 58.0 — Instrumentasi (lakukan lebih dulu)
- Cermin `measure.py`: bungkus titik panas dengan `Stopwatch`; kumpulkan p50/p95.
- Pakai `should_cache` sebagai gerbang sebelum menambah cache.

### 58.1 — Cache widget (Langkah 46)
- Cermin `cache.py` + `targets.cached_widget` per `(run_id, widget)`; `invalidate_run` saat run berubah.

### 58.2 — Cache introspeksi skema (Langkah 47)
- `targets.cached_schema` per source; `invalidate_schema` saat skema berubah.

### 58.3 — Optimasi query/index
- Dari profil nyata: tambah indeks/penyetelan query yang TERBUKTI jadi bottleneck. Ukur ulang.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| Store | Redis (produksi) implementasi get/set(ttl)/delete/delete_prefix (SCAN+DEL). |
| Compute widget/skema | Fungsi mahal Langkah 46/47 sebagai `compute_fn`. |
| Pemicu invalidasi | Panggil `invalidate_run`/`invalidate_schema` saat run/skema berubah. |

---

## 6. Definition of Done (per sasaran, sesuai kebutuhan)

- [ ] Instrumentasi terpasang di titik panas; keputusan caching berbasis `should_cache`.
- [ ] Cache widget mengurangi latensi terbukti; invalidasi per run benar (tak basi).
- [ ] Cache skema benar & ter-invalidasi saat skema berubah.
- [ ] Optimasi query/index didukung profil; latensi turun terukur.
- [ ] Uji (cermin `psd-perf/app/perf/tests/test_perf.py`) hijau.

---

## 7. Non-goals

- Caching menyeluruh/prematur tanpa bukti.
- Cache write-through/komputasi-di-muka kompleks (mulai dari cache-aside).
- Optimasi mikro yang tak terlihat di profil.

---

## 8. Gotcha (dari verifikasi scaffold)

- **Ukur dulu**: `should_cache` butuh **cukup sampel** & p95 di atas ambang — cegah caching spekulatif.
- **Invalidasi adalah bagian tersulit**: pastikan `invalidate_run` dipanggil saat run dijalankan ulang,
  `invalidate_schema` saat skema berubah; jika tidak → data basi.
- **delete_prefix di Redis**: pakai SCAN+DEL (jangan `KEYS` di produksi).
- **TTL ≠ pengganti invalidasi**: TTL membatasi kebasian maksimum; invalidasi eksplisit untuk korektnya.
- **Redis cache vs broker**: pertimbangkan DB/instans terpisah agar beban cache tak ganggu Celery.
- **Ukur lagi setelah optimasi**: pastikan benar lebih cepat, bukan asumsi.

---

## 9. Referensi terverifikasi

`psd-perf/` **lulus 8 uji** (cache-aside compute-sekali, TTL kedaluwarsa, delete invalidasi, cache widget +
invalidate_run, cache skema + invalidasi, statistik/p95, should_cache berbasis bukti, Stopwatch) — murni
Python. Sambungkan store Redis & fungsi compute Langkah 46/47; pasang pemicu invalidasi.
