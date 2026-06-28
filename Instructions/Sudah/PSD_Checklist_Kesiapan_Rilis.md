# PSD — Checklist Kesiapan Rilis & Urutan Migrasi (Langkah 0→47)

> Dokumen referensi rilis. Berisi: pra-syarat infrastruktur, variabel lingkungan per modul (AI/storage/DuckDB/dll), urutan migrasi 0→47, urutan seeding, flip mock→real, titik uji E2E, dan gotcha integrasi yang wajib dicek. Jalankan dari atas ke bawah.

---

## 1. Pra-syarat infrastruktur

Pastikan layanan berikut hidup (Docker Compose) sebelum migrasi:

| Layanan | Fungsi | Wajib untuk |
|---|---|---|
| **PostgreSQL** | DB utama | semua |
| **Redis** | cache, rate-limit, (broker Celery) | 26, 38/40/45 (prod) |
| **MinIO** (S3-compatible) | object storage | 13,15,18,19,38,40,41,45,46 |
| **Meilisearch** | pencarian | 16 |
| **OpenAI API** (eksternal) | fitur AI | 38,40 |
| **DuckDB** (in-process, pustaka) | mesin Pabrik Data | 45,46,47 |
| **Celery worker** (prod) | job async | 38,40,45 |
| **MLflow** (opsional, Fase 1) | registry model | MLOps base |

**Bucket MinIO yang harus dibuat lebih dulu:**
- `psd-media` — media publik (avatar/banner).
- `psd-assets` — file aset repo, dataset, lapisan Parquet pipeline.
- `psd-submissions` — submission kompetisi (privat).

**Indeks Meilisearch:** dibuat saat reindex (lihat §5).

---

## 2. Variabel lingkungan (.env)

> Nama variabel di bawah adalah yang dipakai sepanjang dokumen langkah. **Cocokkan dengan nama nyata di kode Anda** bila berbeda.

### 2.1 Inti / Auth
| Var | Contoh | Catatan |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://psd:...@db:5432/psd` | async driver |
| `REDIS_URL` | `redis://redis:6379/0` | cache & rate-limit |
| `SECRET_KEY` | (acak panjang) | JWT/sesi |
| `ACCESS_TOKEN_TTL` | `3600` | umur token |
| `COOKIE_SECURE` | `true` (prod) | httpOnly cookie (Langkah 14) |
| `COOKIE_DOMAIN` | `.projeksainsdata.com` | sesuaikan domain |
| `CORS_ORIGINS` | `https://projeksainsdata.com` | origin frontend |
| `BASE_URL` | `https://api.projeksainsdata.com` | untuk .ics, tautan notifikasi |

### 2.2 Storage (MinIO/S3) — Langkah 13,15,38,40,41,45,46
| Var | Contoh | Catatan |
|---|---|---|
| `MINIO_ENDPOINT` | `minio:9000` | tanpa skema utk DuckDB |
| `MINIO_ACCESS_KEY` | … | |
| `MINIO_SECRET_KEY` | … | |
| `MINIO_USE_SSL` | `false` (dev) / `true` (prod) | |
| `MINIO_ASSET_BUCKET` | `psd-assets` | dipakai engine DuckDB |
| `MINIO_MEDIA_BUCKET` | `psd-media` | |
| `MINIO_SUBMISSION_BUCKET` | `psd-submissions` | |

> **DuckDB memakai kredensial MinIO yang sama** (lihat `_connect`, Langkah 45): `s3_endpoint`, `s3_access_key_id`, `s3_secret_access_key`, `s3_use_ssl`, `s3_url_style='path'`. Tidak ada kredensial DuckDB terpisah.

### 2.3 Pencarian — Langkah 16
| Var | Contoh |
|---|---|
| `MEILISEARCH_URL` | `http://meilisearch:7700` |
| `MEILISEARCH_KEY` | (master key) |

### 2.4 AI (OpenAI) — Langkah 38,40
| Var | Contoh | Catatan |
|---|---|---|
| `OPENAI_API_KEY` | `sk-…` | klien `app/core/ai/client.py` |
| `AI_MODEL` | `gpt-4o-mini` | model default `chat_json()` |

> Kuota AI dibatasi **per tier gamifikasi** (Langkah 38), bukan hanya env. Pastikan peta `SYNTH_TIER`/`PIPELINE_TIER` sesuai.

### 2.5 Celery (produksi) — Langkah 38,40,45
| Var | Contoh |
|---|---|
| `CELERY_BROKER_URL` | `redis://redis:6379/1` |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` |

> Default dev memakai `BackgroundTasks`; **prod wajib Celery** untuk sintesis (38), data ruang (40), dan run pipeline (45).

### 2.6 Pabrik Data — Langkah 45
| Var | Contoh | Catatan |
|---|---|---|
| `FACTORY_RUN_TIMEOUT_S` | `90` | watchdog `con.interrupt()` |

### 2.7 Fase 1 (belum wajib sekarang)
`MLFLOW_TRACKING_URI`, OAuth provider PSD (`OAUTH_*`), Gitea (`GITEA_URL`, `GITEA_ADMIN_TOKEN`), JupyterHub (`HUB_*`), Superset (`SUPERSET_URL`, guest-token secret).

---

## 3. Urutan migrasi (Alembic) — 0 → 47

> Jalankan **berurutan**; banyak langkah lanjut meng-`ALTER` tabel langkah awal. Jangan lompati. Perintah umum:
> ```bash
> docker compose exec backend alembic upgrade head
> ```
> Bila membangun ulang dari nol, migrasi autogenerate dijalankan dalam urutan revisi yang sama dengan langkah.

**Membuat tabel inti (0–9):** users, repos, competitions, events, discussions/community, courses/learn awal, dsb.

| Langkah | Migrasi menambah | Jenis |
|---|---|---|
| 0–9 | skema inti: users, repos, competitions, events, community, learn, auth | CREATE |
| 10 | (endpoint me; biasanya tanpa tabel baru) | — |
| 11 | likes, discussions per-aset | CREATE |
| 12 | admin (audit/flag bila ada) | CREATE |
| 13 | profil kaya: kolom avatar/banner di users | ALTER |
| 14 | account/security (mis. kolom 2FA/sesi) | ALTER/CREATE |
| 15 | file aset: kolom `files`,`readme_md`,`license` di repos | ALTER |
| 16 | (indeks Meilisearch; tanpa tabel) | — |
| 17 | onboarding (kolom status di users) | ALTER |
| 18 | konten kurasi: `is_official`,`featured`, announcements | ALTER/CREATE |
| 19 | kompetisi lanjutan: submissions, leaderboard | CREATE |
| 20 | LMS: instructor_applications, courses(author/status), enrollments, lesson_progress | CREATE/ALTER |
| 21 | event registrations/waitlist/check-in | CREATE |
| 22 | notebooks | CREATE |
| 23 | settings (JSON di users) | ALTER/CREATE |
| 24 | follows, social_posts, post_likes, post_comments | CREATE |
| 25 | gamification: `reputation`,`badges` di users (POINTS/BADGES di kode) | ALTER |
| 26 | TOS/keamanan (kolom acceptance) | ALTER |
| 27 | `account_type` vs `role` di users | ALTER |
| 28 | blog posts | CREATE |
| 29 | **notifications** | CREATE |
| 30 | course `status`,`publisher_id`,`review_note` | ALTER |
| 31 | lessons (type/materials), quiz | ALTER/CREATE |
| 32 | `access_type`,`access_days` course; `expires_at` enrollment | ALTER |
| 33 | **categories**; `category_id`/`subcategory_id` di repos/notebooks/courses/competitions/events | CREATE/ALTER |
| 34 | quests, quest_claims | CREATE |
| 35 | activity_events | CREATE |
| 36 | micro_lessons, micro_completions | CREATE |
| 37 | teams, team_members, team_invites, team_join_requests; `team_id` di repos/notebooks | CREATE/ALTER |
| 38 | synthesis_jobs; `synthetic`,`generation_spec` di repos | CREATE/ALTER |
| 39 | **idea_rooms**, problem_components | CREATE |
| 40 | room_problems; `generation_error` di idea_rooms; **`room_id` di repos** | CREATE/ALTER |
| 41 | room_submissions (POINTS/BADGES `room_finished` di kode) | CREATE |
| 42 | `room_id` di competitions & notebooks | ALTER |
| 43 | collections | CREATE |
| 44 | data_sources, pipelines | CREATE |
| 45 | pipeline_runs | CREATE |
| 46 | dashboards, widgets | CREATE |
| 47 | (tanpa tabel baru; pakai `data_sources.schema_json` dari 44) | — |

**Verifikasi pasca-migrasi:** `alembic current` = revisi terakhir; cek tabel kunci ada (`idea_rooms`, `pipelines`, `pipeline_runs`, `dashboards`, `collections`, `data_sources`).

---

## 4. Urutan seeding (setelah migrasi)

Jalankan dalam urutan ini:

1. **Akun resmi PSD** (`PSD_OFFICIAL_USERNAME=psd`, akun organisasi) — Langkah 18. Banyak konten kurasi & publisher course bergantung padanya.
2. **Kategori** (Langkah 33), termasuk kategori utama **`Transformer`** (untuk hub Langkah 43). Tanpa ini, hub Transformer kosong & banyak filter kategori tak berfungsi.
3. **Konten kurasi & announcement** (Langkah 18) — `seed_content`.
4. **Micro-lessons** (Langkah 36) & **quests** (Langkah 34) awal — agar streak/journey punya isi.
5. **Koleksi unggulan Transformer** (Langkah 43) — minimal 1–2 koleksi berisi aset contoh.
6. **Reindex Meilisearch** (Langkah 16) — indeks ulang semua aset/akun setelah seed.

---

## 5. Flip mock → real (Frontend)

1. Set `NEXT_PUBLIC_USE_MOCKS=false`.
2. Pastikan `NEXT_PUBLIC_API_BASE` menunjuk API nyata.
3. Verifikasi MSW handler **tidak** aktif di build produksi.
4. Smoke test tiap area utama memuat data nyata (tanpa error skema Zod).

---

## 6. Titik uji E2E (urut prioritas)

Uji **alur penuh** tiap area dengan akun nyata. Tandai lulus/tidak.

### A. Fondasi
- [ ] Daftar → onboarding → login (cookie httpOnly) → edit profil + unggah avatar (MinIO).
- [ ] Buat repo (model/dataset/proyek) → unggah file → muncul di pencarian (Meilisearch) & discover.
- [ ] Like, diskusi per-aset, follow, post sosial, feed.
- [ ] Gamifikasi: aksi menambah reputasi; badge & tier berubah.
- [ ] Notifikasi (Langkah 29): follow/komentar memicu lonceng.

### B. Pembelajaran & kompetisi
- [ ] Ajukan instruktur → buat course (draft) → submit review → admin publish (two-party, Langkah 30) → enroll → lesson/quiz (Langkah 31) → akses/expiry (Langkah 32).
- [ ] Kompetisi: submit prediksi → skor (RMSE/Accuracy) → leaderboard publik/privat (Langkah 19).
- [ ] Event: daftar → waitlist → check-in → unduh .ics (Langkah 21).

### C. Mesin Data Sintesis (Langkah 38)
- [ ] Cek kuota per tier → buat job dari prompt (LLM plan) → generasi lokal → publish dataset berlabel `synthetic`.
- [ ] Job dari spec langsung (tanpa LLM) tidak memotong kuota AI.

### D. Tim & Ruang Ide (Langkah 37, 39–42)
- [ ] Buat tim; undang/terima anggota; atur peran; transfer owner.
- [ ] **Siklus Ruang Ide penuh:** buat ruang (auto-tim) → publish → start-framing → anggota tambah komponen → close → **frame-problem (AI)** → master tinjau/sunting → **generate-data** (sintesis) → status solving → kerja aset tim → submit → **finish** (badge+reputasi ke semua anggota) → **challenge** (kompetisi) / publish aset (provenance `room_id`).
- [ ] Jalur **collect** (unstructured): generate-data→collect → anggota unggah data → dataset ruang.
- [ ] Jalur **secondary**: tautkan dataset sumber.
- [ ] Kegagalan generasi mengembalikan ruang ke `closed` + `generation_error`.

### E. Ruang Transformer (Langkah 43)
- [ ] `GET /hub/transformer` menampilkan kategori + koleksi unggulan + aset teratas.
- [ ] Staf buat/sunting koleksi; item ter-resolusi.
- [ ] Hub aman saat kategori belum ada (`category: null`).

### F. Pabrik Data → Ruang Analitik (Langkah 44–47)
- [ ] Daftarkan dataset jadi sumber (URI `psd://dataset/...`).
- [ ] Susun pipeline di **kanvas** (Langkah 47): source→transform(medallion)→sink; simpan posisi.
- [ ] **Validasi** menolak siklus/op tak dikenal/melebihi node tier.
- [ ] **Jalankan** (Langkah 45): kuota `runs_per_day` ditegakkan; DuckDB baca MinIO; lapisan bronze/silver/gold tertulis Parquet; lineage & rows_out tercatat; timeout bekerja.
- [ ] Introspeksi skema sumber (Langkah 47) mengisi pemilih kolom.
- [ ] **Dashboard** (Langkah 46): widget 6 jenis render dari gold terbaru; publik/privat; `{empty}` rapi saat belum ada run.

---

## 7. Gotcha integrasi yang WAJIB dicek

Ini titik rawan yang ditandai saat membangun:

1. **`path_key` untuk DuckDB (Langkah 45 §45.4).** `_resolve_source` butuh **kunci objek MinIO**, bukan URL publik. Pastikan unggah aset (Langkah 15) menyimpan `path_key` di `files[]`, atau run pipeline gagal membaca sumber.
2. **`tier_for` di quota (Langkah 38 & 44).** Sesuaikan tanda tangan `tier_for(reputation)→nama_tier` dengan implementasi nyata Langkah 25.
3. **BackgroundTasks → Celery (prod).** Sintesis (38), data ruang (40), run pipeline (45) memakai `BackgroundTasks` di dev; **ganti Celery** sebelum produksi agar tak membebani API.
4. **Urutan `room_id`.** `repos.room_id` ditambah di Langkah 40, `competitions/notebooks.room_id` di 42 — jangan jalankan 41/42 sebelum 40.
5. **Kategori `Transformer` harus di-seed** sebelum hub (43) bernilai.
6. **Kuota AI = rem biaya.** Verifikasi `SYNTH_TIER` (38) & `PIPELINE_TIER` (44) terpasang; tanpa ini biaya OpenAI/compute bisa melonjak.
7. **Keamanan eksekusi.** Pastikan tidak ada jalur SQL mentah; hanya `ident()`/operasi terdaftar (Langkah 45/46).
8. **Label sintesis dipertahankan** saat publish (Langkah 38/42) — jangan sampai data sintesis tampak seperti data resmi.

---

## 8. Catatan produksi (singkat)

- **Celery + worker terpisah** untuk semua job async; pisahkan antrian AI vs Pabrik Data bila perlu.
- **Cache widget** (Redis) per `(run_id, widget)` bila dashboard ramai (Langkah 46).
- **Timeout & batas baris/node** per tier adalah pertahanan utama biaya Pabrik Data.
- **GPU:** tidak ada di Fase 0/1 (sesuai strategi — jangan kejar paritas compute Kaggle).
- **Backup:** Postgres + bucket MinIO; uji restore sebelum pilot.

---

## 9. Runbook rilis (ringkas)

```
1. Naikkan layanan (Postgres, Redis, MinIO, Meilisearch).            # §1
2. Buat 3 bucket MinIO.                                              # §1
3. Set .env semua modul.                                            # §2
4. alembic upgrade head  (verifikasi 0→47 berurutan).               # §3
5. Seed: akun psd → kategori(+Transformer) → konten → micro/quest
   → koleksi Transformer → reindex Meilisearch.                     # §4
6. Frontend: NEXT_PUBLIC_USE_MOCKS=false → build → deploy.          # §5
7. Jalankan E2E A–F; catat kegagalan.                              # §6
8. Cek 8 gotcha (§7), terutama path_key & Celery.                  # §7
9. (Prod) aktifkan Celery worker; pantau biaya AI/run.            # §8
10. Pilot terbatas ITERA → kumpulkan umpan balik → Fase 1.
```

> **Fase 1 berikutnya (di luar checklist ini):** OAuth provider PSD → Gitea base → JupyterHub base → Superset embed → MLOps serving/monitoring → AI Asisten & Rekomendasi (#9, pakai data Langkah 35).
