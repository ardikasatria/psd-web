# Langkah 40 — Backend Gamifikasi Pabrik Data: Batas Dua Engine per Tier + Poin Aktivitas + Quest

> **Tujuan:** Batasi **dua opsi engine** (DuckDB/SQL & Spark/PySpark) lewat **tier gamifikasi**, jadikan
> **aktivitas Pabrik Data sebagai poin** (yang menaikkan tier → membuka lebih banyak), dan kemas sebagai
> **quest**. **Menyatukan Langkah 38/39 dengan gamifikasi (25).** Prasyarat: 25 (gamifikasi pusat),
> 38 (DuckDB), 39 (Spark).
>
> Logika inti **lulus 7 uji** di `psd-df-gamify/app/df_gamify/`.

## 1. Loop gamifikasi (inti desain)

```
Aktivitas Pabrik Data → Poin → Tier naik → Kapabilitas engine terbuka → Aktivitas lebih besar
                         └────────────── Quest memberi bonus poin ──────────────┘
```

**Batas dua engine per tier** (`limits.ENGINE_MATRIX`):

| Tier | DuckDB | Spark |
|---|---|---|
| pemula | ✅ (≤200 MB, 5 run/hari, tanpa SQL mentah) | 🔒 terkunci |
| menengah | ✅ (≤1 GB, 30 run/hari, **SQL mentah**) | ✅ (≤20 GB, 10 run/hari, **tanpa** kode .py) |
| lanjut | ✅ (≤5 GB, 100 run/hari) | ✅ (≤200 GB, 50 run/hari, **kode .py**) |

## 2. Service (cermin scaffold teruji)

- `limits.check_engine_allowed/check_run_quota/check_data_size/can_use_raw_sql/can_use_raw_code`.
- `points.points_for/award` — event Pabrik Data → poin.
- `quests.progress/is_complete/claimable/reward_points` + `DF_QUESTS` (seed).

## 3. Integrasi di eksekusi (Langkah 38/39)

Saat `run` pipeline:
```
tier = seams.user_tier(user)
limits.check_engine_allowed(tier, engine)                 # 403 bila terkunci
limits.check_run_quota(tier, engine, seams.runs_today(user, engine))   # 429
limits.check_data_size(tier, engine, est_bytes)           # 413
if pakai node SQL mentah  and not limits.can_use_raw_sql(tier, engine): 403
if pakai node kode .py    and not limits.can_use_raw_code(tier, engine): 403  # + grant (Langkah 26)
... jalankan ...
# sukses → catat poin & counter quest:
seams.record_points(user, "df_pipeline_run_success", points.award("df_pipeline_run_success"))
if engine == "spark": seams.record_points(user, "df_spark_run_success", points.award("df_spark_run_success"))
if dataset dipublikasikan: seams.record_points(user, "df_dataset_published", points.award("df_dataset_published"))
```
Setiap event juga menambah counter quest (via gamifikasi pusat). Poin masuk engine gamifikasi → tier di-recompute.

## 4. Endpoint — quest `app/modules/quests/router.py`

| Method | Path | Aksi |
|---|---|---|
| GET | `/quests` | Daftar quest + **progres** pengguna (`progress`) — untuk panel quest. |
| GET | `/quests/{id}` | Detail + progres. |
| POST | `/quests/{id}/claim` | `claimable` → `seams.claim_reward` (tambah poin reward, tandai diklaim). 409 bila tak claimable. |
| GET | `/datafactory/engines/limits` | Kapabilitas dua engine untuk tier pengguna (untuk UI pemilih + halaman panduan). |

## 5. Definition of Done

- [ ] Dua engine dibatasi per tier (allowed, run/hari, ukuran data, SQL/kode mentah).
- [ ] Aktivitas Pabrik Data memberi **poin** (masuk gamifikasi pusat → tier).
- [ ] Quest menampilkan progres & bisa **diklaim** sekali (reward poin).
- [ ] Endpoint limits menyediakan data untuk UI pemilih & halaman panduan.
- [ ] Logika (cermin `psd-df-gamify/app/df_gamify/tests/`) hijau.

## 6. Gotcha

- **Konsistensi batas**: `limits` di sini jadi sumber kebenaran; router 38/39 harus memakainya (jangan hard-code ulang).
- **Poin & tier via gamifikasi pusat** (Langkah 25) — modul ini hanya menghitung; pencatatan lewat seam.
- **Klaim quest sekali** (kecuali repeatable) — cegah klaim ganda (idempoten di server).
- **Anti-abuse**: run gagal jangan diberi poin; batasi poin per event agar tak difarming (rate/limit harian).
- **Kode .py tetap butuh grant (Langkah 26)** selain tier lanjut — dua lapis.
