# Langkah 32 — Kompetisi Disempurnakan (Gaya Kaggle): Submission Tim, Review Admin, Leaderboard, Notebook, Statistik

> **Tujuan:** Sempurnakan detail kompetisi seperti Kaggle: **submission tim**, **penilaian/review oleh
> admin humas** (bukan auto), **leaderboard** dari submission yang dinilai, **notebook khusus kompetisi**
> (dengan favorit & urut favorit), **statistik**, dan **bar progres deadline**. **Kerjakan setelah
> Langkah 19 (submission), 52b (notebook), 29 (engagement/favorit).** Prasyarat: 19, 21, 29, 52b, Teams.
>
> Logika inti **lulus 7 uji** di `psd-competition/app/competition/`.

## 1. Model (tambahan/penyesuaian)

```python
class Submission(Base):
    __tablename__ = "competition_submissions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    notebook_id: Mapped[str | None] = mapped_column(String, nullable=True)   # opsional: submit dari notebook
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="submitted", index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class CompetitionNotebook(Base):
    __tablename__ = "competition_notebooks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"cnb_{uuid.uuid4().hex[:12]}")
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    notebook_id: Mapped[str] = mapped_column(String, index=True)   # notebook (Langkah 52b)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

Kolom kompetisi: `start_at`, `deadline_at`, `higher_is_better: bool` (akurasi=true / RMSE=false), `max_score`.

```bash
docker compose exec backend alembic revision --autogenerate -m "competition_enhance"
docker compose exec backend alembic upgrade head
```

## 2. Service (cermin scaffold teruji)

- `deadline.progress(start, deadline, now)` → fase + bar progres + sisa waktu.
- `submission.apply_action/validate_score` → alur review admin (submitted→under_review→scored|rejected).
- `submission.leaderboard(subs, higher_is_better)` → terbaik per peserta (tim/solo), urut + rank.
- `notebooks.rank_by_favorites` & `notebooks.competition_stats`.

## 3. Endpoint — `app/modules/competition/router.py`

**Publik/peserta:**

| Method | Path | Aksi |
|---|---|---|
| GET | `/competitions/{slug}` | Detail + `deadline.progress` + statistik + leaderboard ringkas. |
| GET | `/competitions/{slug}/leaderboard` | Leaderboard penuh (paginated). |
| GET | `/competitions/{slug}/stats` | `competition_stats`. |
| GET | `/competitions/{slug}/notebooks` | Notebook kompetisi, **urut favorit** (`rank_by_favorites`). |
| POST | `/competitions/{slug}/notebooks` | Buat notebook khusus kompetisi (runtime Langkah 52b, konteks competition_id). |
| POST | `/competitions/{slug}/notebooks/{id}/favorite` | Toggle favorit → update `favorite_count` (reuse engagement Langkah 29). |
| POST | `/competitions/{slug}/submissions` | Kirim submission (solo/tim). Cek **deadline open** & batas harian (perks Langkah 25). Status `submitted`. |
| GET | `/competitions/{slug}/submissions/me` | Submission milik sendiri/tim + status & skor. |
| GET | `/competitions/{slug}/teams` | Tim peserta. |

**Admin/humas** (guard `require_humas`):

| Method | Path | Aksi |
|---|---|---|
| GET | `/admin/competitions/{slug}/submissions?status=` | Antrian review (paginated). |
| POST | `/admin/competitions/{slug}/submissions/{id}/start-review` | `apply_action("start_review")`. |
| POST | `/admin/competitions/{slug}/submissions/{id}/score` | `{score, note}` → `validate_score` (range `max_score`) → `apply_action("score")`; set `reviewed_by/at`. Beri reputasi `submission_scored` (Langkah 25); badge `juara` saat final ranking. |
| POST | `/admin/competitions/{slug}/submissions/{id}/reject` | `{note}` → `apply_action("reject")`. |
| POST | `/admin/competitions/{slug}/submissions/{id}/reopen` | `apply_action("reopen")`. |

## 4. Submission tim & leaderboard

- Submission boleh atas nama **tim** (`team_id`) atau **solo** (`user_id`). Leaderboard memakai
  **submission terbaik per peserta** (`best_per_entrant`), arah skor `higher_is_better`.
- Submission masuk leaderboard **hanya setelah `scored`** (dinilai admin) — bukan saat submit.

## 5. Definition of Done

- [ ] Detail kompetisi menampilkan progres deadline, statistik, leaderboard, tab notebook.
- [ ] Submission (solo/tim) tersimpan `submitted`; ditolak bila deadline tutup / lewat batas harian.
- [ ] **Admin humas menilai** submission (start-review/score/reject/reopen) dengan validasi skor & jejak reviewer.
- [ ] Leaderboard = terbaik per peserta, hanya yang `scored`, urut benar (max/min) + rank.
- [ ] Notebook kompetisi dibuat & **diurut favorit**; favorit menaikkan urutan.
- [ ] Logika (cermin `psd-competition/app/competition/tests/`) hijau.

## Gotcha

- **Skor dari admin, bukan auto** — leaderboard hanya menampilkan `scored`.
- **Arah skor** (`higher_is_better`) wajib benar; salah arah membalik peringkat.
- **Terbaik per peserta** (bukan semua submission) agar adil; seri → submit lebih awal.
- **Deadline ditegakkan di server** saat submit (jangan andalкан klien).
- **Favorit notebook** reuse engagement (Langkah 29) — jaga `favorite_count` konsisten.
- **Guard humas** wajib di semua endpoint `/admin/...`.
