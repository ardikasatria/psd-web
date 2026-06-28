# Brief Agen Cursor — Langkah 57: AI Asisten & Rekomendasi 🟡

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 57 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode."*
>
> Spesifikasi, bukan kode tempel. Bersandar pada activity-summary Langkah 35 + OpenAI; tier (Langkah 52).
> Scaffold referensi **lulus 11 uji** di `psd-assistant/`.
>
> ⏳ **Ditaruh paling akhir dengan sengaja.** Baru bernilai setelah ada cukup pengguna aktif. Bangun
> terlalu dini = rekomendasi kosong/buruk → mesin **WAJIB** fallback popularitas saat cold-start.

---

## 1. Tujuan

Rekomendasi personal (dataset/course/kompetisi/ruang) + asisten dalam-platform yang mengarahkan ke fitur.

**Prasyarat:** Langkah 35 (activity-summary) + OpenAI. Kuota AI di-gate gamifikasi (rem biaya).

---

## 2. Keputusan desain (dikunci kecuali alasan kuat)

1. **Rekomendasi berbasis konten** dari afinitas kategori/tag (`activity-summary` Langkah 35).
2. **Cold-start → fallback popularitas** (ambang aktivitas minimum). Cegah feed kosong/acak.
3. **Asisten gated kuota per tier** (rem biaya OpenAI). Konsisten strategi gamifikasi PSD.
4. **Asisten on-platform**: system prompt mengarahkan ke fitur PSD; jangan mengarang fitur di luar konteks.
5. **Diversitas**: cap per-kategori agar feed tak monoton.
6. **OpenAI di balik seam** (`llm_complete`) — mudah diuji & diganti.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & laporkan; ambigu → berhenti & tanya.

- [ ] **Bentuk `activity-summary` Langkah 35**: apakah {categories, tags, event_count}? Petakan ke `build_affinity`.
- [ ] Sumber **kandidat** item per jenis (dataset/course/kompetisi/ruang) + atribut categories/tags.
- [ ] Sinyal **popularitas** per jenis (untuk cold-start).
- [ ] **Status pengguna** untuk "langkah berikutnya" (progres course, kompetisi, publikasi, poin/tier).
- [ ] Tier gamifikasi (Langkah 52) & Redis (Langkah 49) untuk kuota AI.
- [ ] Konfigurasi OpenAI (model, kunci) & kebijakan biaya.
- [ ] **Apakah sudah cukup pengguna aktif?** Bila belum → utamakan jalur popularitas; tunda personalisasi penuh.

**Pertanyaan untuk manусia:**
1. Ambang cold-start (min event sebelum afinitas dipakai; default 5)?
2. Jatah kuota AI tiap tier & jendela (default 20/100/500 per hari) — atau anggaran token?
3. Model OpenAI mana & batas biaya? Caching jawaban umum untuk hemat?

---

## 4. Sub-langkah

### 57.1 — Rekomendasi afinitas
- Cermin `affinity.py` (profil dari activity-summary) + `recommend.py` (skor + cold-start + cap).
- Sambungkan seam kandidat & popularitas; endpoint/komponen feed.

### 57.2 — Asisten kontekstual (gated kuota)
- Cermin `assistant.py` (rakit pesan + gating) + `quota.py` (kuota AI per tier).
- `llm_complete` → OpenAI. System prompt on-platform; injeksi konteks fitur/pengguna.

### 57.3 — Feed personal & "langkah berikutnya"
- Cermin `feed.py`: aturan `next_steps` + `build_feed`. Endpoint `GET /api/feed`.

---

## 5. Seam integrasi

| Seam | Tugas agen |
|---|---|
| `activity_summary(user_id)` | Ringkasan Langkah 35. |
| `candidate_items(kind)` | Kandidat per jenis (id, categories, tags). |
| `popularity(kind)` | Skor popularitas untuk cold-start. |
| `user_state(user_id)` | Status untuk "langkah berikutnya". |
| `user_id`/`user_tier(user)` | Identitas & tier (kuota AI). |
| `llm_complete(messages)` | Panggil OpenAI. |
| Store kuota | Redis (produksi). |

---

## 6. Definition of Done

- [ ] Rekomendasi afinitas berfungsi untuk semua jenis; **cold-start jatuh ke popularitas**.
- [ ] Diversitas (cap per-kategori) & exclusion item yang sudah dilihat.
- [ ] Asisten menjawab & mengarahkan ke fitur; **kuota tier ditegakkan (429 saat habis)**.
- [ ] Feed personal + "langkah berikutnya" tampil.
- [ ] OpenAI di balik seam; biaya ter-gate gamifikasi.
- [ ] Uji (cermin `psd-assistant/app/assistant/tests/test_assistant.py`) hijau.

---

## 7. Non-goals

- Rekomendasi kolaboratif (matrix factorization) — afinitas konten cukup awal; menyusul bila data kaya.
- Fine-tuning model — gunakan prompt + konteks.
- Asisten agentik (aksi otomatis) — fase ini hanya menjawab & mengarahkan.

---

## 8. Gotcha (dari verifikasi scaffold)

- **Cold-start wajib**: pengguna minim aktivitas → popularitas, bukan skor afinitas (nol → acak/kosong).
  Inilah inti "jangan bangun terlalu dini".
- **Kuota = rem biaya**: gating SEBELUM memanggil OpenAI; rollback hitungan saat melewati batas.
- **System prompt on-platform**: cegah asisten mengarang fitur; beri konteks fitur nyata.
- **Diversitas**: tanpa cap, satu kategori dominan bisa memenuhi feed.
- **Jangan panggil OpenAI di jalur kritis tanpa timeout/caching**; pertimbangkan cache jawaban umum.
- **Personalisasi mengikuti data**: nilai naik seiring aktivitas; pantau kualitas, jangan paksa terlalu dini.

---

## 9. Referensi terverifikasi

`psd-assistant/` **lulus 11 uji** (afinitas ternormalisasi, cold-start popularitas, ranking afinitas,
exclude+cap, kuota AI 429, injeksi konteks, panggil LLM, aturan langkah-berikutnya, urutan feed,
endpoint ask gated, feed cold-start) — murni Python + FastAPI TestClient. Isi seam dengan
activity-summary Langkah 35, kandidat/popularitas, OpenAI, & tier PSD.
