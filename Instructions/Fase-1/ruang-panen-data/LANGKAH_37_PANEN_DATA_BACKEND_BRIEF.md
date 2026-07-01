# Langkah 37 — Backend Ruang Panen Data (Scraping API Eksternal → Aset Dataset)

> **Tujuan:** Fitur **Ruang Panen Data**: memanen data dari API situs lain, lalu **menyalurkan hasilnya
> ke aset DATASET milik user** (bukan disimpan sendiri seperti Data Sintesis). Job async, aman dari SSRF,
> sopan (rate limit + allowlist), dengan paginasi. **Kerjakan setelah dataset (15/31), Celery (49),
> gamifikasi/kuota (25), MinIO.** Prasyarat: dataset, Celery, gamifikasi, MinIO.
>
> Logika inti **lulus 8 uji** di `psd-harvest/app/harvest/`.
>
> **Nama fitur (saran):** "Ruang Panen Data" (utama) / alternatif "Jala Data" / "Saluran Data".

## 1. Konsep

- User menyusun **job panen**: sumber (URL API + method + params + auth), strategi paginasi, batas
  (max_pages/max_records), pemetaan field, dan **tujuan dataset** (dataset baru atau versi baru).
- Job dijalankan **async (Celery)**: fetch → paginasi → ekstraksi record → tulis ke **aset dataset**.
- Hasil = aset **Dataset** (Langkah 31) — sehingga langsung punya README/versi/tab file, bisa dibagikan,
  dilihat, dipakai di notebook/kompetisi. Inilah keterhubungan yang diminta.

## 2. Model

```python
class HarvestJob(Base):
    __tablename__ = "harvest_jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"hv_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String)
    method: Mapped[str] = mapped_column(String, default="GET")
    params: Mapped[str] = mapped_column(Text, default="{}")       # JSON
    auth_type: Mapped[str] = mapped_column(String, default="none")  # none|api_key|bearer|basic
    # rahasia auth DISIMPAN DI VAULT, bukan di sini (simpan referensi saja)
    auth_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    pagination: Mapped[str] = mapped_column(String, default="none") # none|page|offset|cursor
    page_size: Mapped[int] = mapped_column(Integer, default=50)
    max_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_records: Mapped[int | None] = mapped_column(Integer, nullable=True)
    records_path: Mapped[str | None] = mapped_column(String, nullable=True)   # "data.items"
    field_map: Mapped[str | None] = mapped_column(Text, nullable=True)        # JSON {out: src}
    rate_per_min: Mapped[int] = mapped_column(Integer, default=30)
    output_mode: Mapped[str] = mapped_column(String, default="new")           # new|version
    output_format: Mapped[str] = mapped_column(String, default="csv")         # csv|jsonl|parquet
    dataset_slug: Mapped[str | None] = mapped_column(String, nullable=True)    # utk output_mode=version
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    records_written: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_dataset: Mapped[str | None] = mapped_column(String, nullable=True)  # slug dataset hasil
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

```bash
docker compose exec backend alembic revision --autogenerate -m "harvest_jobs"
docker compose exec backend alembic upgrade head
```

## 3. Service (cermin scaffold teruji)

- `job.apply_action` — siklus draft→queued→running→completed|failed|canceled|retry.
- `source.validate_source_url` (**SSRF + allowlist**) & `validate_auth`.
- `pagination.next_request_params/should_continue/min_interval_seconds`.
- `routing.extract_records/output_target/output_filename`.

## 4. Worker (Celery) — alur eksekusi

```
start(job) → RUNNING
loop:
    params = base_params + next_request_params(strategy, pages_done, page_size, next_cursor)
    resp = seams.fetch(url, method, params, headers=load_auth_headers(job), timeout)   # AMAN (cek SSRF)
    rows = routing.extract_records(resp, records_path, field_map)
    buffer += rows; pages_done += 1; records_done += len(rows)
    next_cursor = get_by_path(resp, cursor_path) if strategy=="cursor" else None
    sleep(min_interval_seconds(rate_per_min))
    if not should_continue(...): break
target = routing.output_target(mode=output_mode, owner=user, dataset_slug=..., new_name=job.name)
result = seams.write_to_dataset(target, buffer, fmt=output_format, filename=output_filename(...))
complete(job); job.result_dataset = result["dataset_slug"]
```

- Batasi ukuran respons & total record (hindari OOM); tulis streaming ke MinIO bila besar.
- `check_quota(user)` sebelum enqueue (batasi frekuensi/volume per tier).

## 5. Endpoint — `app/modules/harvest/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/harvest/jobs` | Buat job (`validate_source_url` + `validate_auth`; simpan rahasia auth ke vault). Status `draft`. |
| POST | `/harvest/jobs/{id}/run` | `check_quota` → `apply_action("queue")` → enqueue Celery. |
| GET | `/harvest/jobs` | Daftar job user + status + progres. |
| GET | `/harvest/jobs/{id}` | Detail + `records_written` + `result_dataset`. |
| POST | `/harvest/jobs/{id}/cancel` | `apply_action("cancel")`. |
| POST | `/harvest/jobs/{id}/retry` | `apply_action("retry")` → enqueue. |
| POST | `/harvest/preview` | (Opsional) fetch 1 halaman → `extract_records` untuk pratinjau pemetaan (tanpa simpan). |

Setelah selesai: tautkan `result_dataset` → user diarahkan ke halaman dataset (Langkah 31).

## 6. Definition of Done

- [ ] User membuat job panen; sumber divalidasi (**SSRF diblokir**, allowlist dihormati, https).
- [ ] Job async memanen berpaginasi dengan batas & rate limit sopan.
- [ ] Hasil **disalurkan ke aset dataset** (baru/versi), bukan disimpan terpisah.
- [ ] Status & progres terlacak; cancel/retry berfungsi; kuota per tier ditegakkan.
- [ ] Logika (cermin `psd-harvest/app/harvest/tests/`) hijau.

## 7. Gotcha (keamanan & etika — penting)

- **SSRF**: validasi URL DAN **cek IP hasil resolusi DNS saat fetch** (anti DNS-rebinding); blokir
  privat/loopback/link-local/metadata. `validate_source_url` menutup literal; layer HTTP menutup sisanya.
- **Rahasia auth di vault**, bukan DB/plaintext; jangan pernah kirim ke frontend.
- **Kesopanan & legalitas**: hormati rate limit, `robots`/ToS sumber, dan sediakan **allowlist domain**
  yang dikelola admin. Panen hanya untuk sumber yang diizinkan/legal — tampilkan disclaimer.
- **Batas ukuran**: cap total record & ukuran berkas; streaming ke MinIO; timeout per permintaan.
- **Idempоten/aman diulang**: retry tak menggandakan versi dataset tanpa sengaja (tandai run id).
- **Kuota**: panen boros kuota jaringan/penyimpanan — gate per tier (gamifikasi).
