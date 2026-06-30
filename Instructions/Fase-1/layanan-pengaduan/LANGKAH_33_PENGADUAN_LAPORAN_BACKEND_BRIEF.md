# Langkah 33 — Backend Pengaduan Platform (Tiket) & Laporan Konten (Moderasi Feed & Forum)

> **Tujuan:** Dua fitur: **(1) Pengaduan platform** — tiket keluhan/error tentang platform, ditangani
> admin/support; **(2) Laporkan konten** — pengguna melaporkan postingan **feed**, komentar, dan **forum**
> (thread/reply) yang melanggar → **antrian moderasi** dengan auto-flag & keputusan moderator.
> **Kerjakan setelah sosial/feed (Langkah 24), forum, & notifikasi (Langkah 29).** Prasyarat: 24, 29, forum, peran admin.
>
> Logika inti **lulus 8 uji** di `psd-reports/app/reports/`.

## 1. Model

```python
class SupportTicket(Base):                      # pengaduan platform
    __tablename__ = "support_tickets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"tk_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String)        # bug|error|akun|data|fitur|lainnya
    priority: Mapped[str] = mapped_column(String, default="sedang")  # rendah|sedang|tinggi|kritis
    subject: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="open", index=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TicketMessage(Base):                       # percakapan tiket (balasan support ↔ user)
    __tablename__ = "ticket_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("support_tickets.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ContentReport(Base):                       # agregasi laporan per target
    __tablename__ = "content_reports"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rp_{uuid.uuid4().hex[:12]}")
    target_key: Mapped[str] = mapped_column(String, unique=True, index=True)  # "<kind>:<id>"
    kind: Mapped[str] = mapped_column(String)        # post|feed|comment|thread|reply
    target_id: Mapped[str] = mapped_column(String)
    report_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending|reviewing|resolved
    decision: Mapped[str | None] = mapped_column(String, nullable=True)         # dismiss|remove|warn|ban|lock
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ReportEntry(Base):                          # satu baris per pelapor (dedup)
    __tablename__ = "report_entries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("content_reports.id"), index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(String)      # spam|pelecehan|kebencian|...
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    __table_args__ = (UniqueConstraint("report_id", "reporter_id", name="uq_report_reporter"),)
```

```bash
docker compose exec backend alembic revision --autogenerate -m "support_and_reports"
docker compose exec backend alembic upgrade head
```

## 2. Service (cermin scaffold teruji)

- `tickets`: `validate_category/validate_priority`, `apply_action` (open→in_progress→resolved→closed/reopen).
- `content_reports`: `target_key/is_reportable`, `validate_reason`, `add_report` (dedup), `report_count`,
  `should_auto_flag`, `apply_action` (pending→reviewing→resolved), `validate_decision`.
- `queue`: `sort_tickets` (prioritas+umur), `sort_moderation` (flagged+jumlah+umur).

## 3. Endpoint — pengaduan platform `app/modules/support/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/support/tickets` | Buat tiket (`validate_category/priority`); status `open`. |
| GET | `/support/tickets/me` | Tiket milik sendiri + status. |
| GET | `/support/tickets/{id}` | Detail + pesan. |
| POST | `/support/tickets/{id}/messages` | Balasan (user atau staff). |
| **GET** | `/admin/support/tickets?status=&priority=` | Antrian (`sort_tickets`). **Guard staff.** |
| **POST** | `/admin/support/tickets/{id}/assign` | `apply_action("assign")` + set assignee. |
| **POST** | `/admin/support/tickets/{id}/resolve` | `apply_action("resolve")`. |
| **POST** | `/admin/support/tickets/{id}/close` | `apply_action("close")`. |
| **POST** | `/admin/support/tickets/{id}/reopen` | `apply_action("reopen")`. |

Notifikasi (Langkah 29) ke pelapor saat status berubah / ada balasan staff.

## 4. Endpoint — laporan konten `app/modules/reports/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/reports` | `{kind, target_id, reason, detail}` → `target_key` (422 bila tak reportable) → `validate_reason` → upsert `ContentReport` + `ReportEntry` (dedup via unique). Update `report_count`; `should_auto_flag` → set `flagged`. **Idempoten per pelapor** (lapor ganda → tetap satu). |
| GET | `/reports/me` | Laporan yang saya buat (status ringkas). |
| **GET** | `/admin/reports?flagged=&status=` | Antrian moderasi (`sort_moderation`). **Guard moderator.** |
| **POST** | `/admin/reports/{id}/start-review` | `apply_action("start_review")`. |
| **POST** | `/admin/reports/{id}/resolve` | `{decision}` → `validate_decision` → `apply_action("resolve")`; jalankan efek `apply_moderation_effect` (remove/lock/warn/ban). |
| **POST** | `/admin/reports/{id}/reopen` | `apply_action("reopen")`. |

- **Lapor dari mana saja**: feed (`post`/`feed`), komentar (`comment`), forum (`thread`/`reply`).
- **Auto-flag**: saat `report_count ≥ ambang` (mis. 3) → `flagged=True` (naik prioritas antrian). Ambang dari konfig.
- **Efek keputusan**: `remove` sembunyikan/hapus konten; `lock` kunci thread forum; `warn`/`ban` ke akun penulis (modul akun). Catat `reviewed_by`.

## 5. Definition of Done

- [ ] Pengguna bisa membuat **tiket pengaduan platform**; staff menangani (assign/resolve/close/reopen) via antrian terurut.
- [ ] Pengguna bisa **melaporkan** post feed, komentar, thread & reply forum dengan alasan; **dedup per pelapor**.
- [ ] **Auto-flag** saat jumlah pelapor ≥ ambang; antrian moderasi mengutamakan flagged.
- [ ] Moderator menyelesaikan laporan dengan **keputusan** (dismiss/remove/warn/ban/lock) + efeknya berjalan.
- [ ] Notifikasi status ke pelapor/pengadu.
- [ ] Logika (cermin `psd-reports/app/reports/tests/`) hijau.

## 6. Gotcha

- **Dedup di DB** (unique `report_id+reporter_id`), bukan hanya cek aplikasi — cegah balapan lapor ganda.
- **`target_key` polimorфik** ("<kind>:<id>") jadi sumber kebenaran agregasi; validasi `kind` reportable.
- **Jangan bocorkan identitas pelapor** ke pemilik konten; moderator saja yang lihat.
- **Efek `remove/ban`** harus reversible/tercatat (audit) — keputusan bisa di-reopen.
- **Guard peran** wajib di semua `/admin/...` (staff untuk tiket, moderator untuk laporan).
- **Anti-penyalahgunaan**: batasi rate lapor per pengguna; lapor diri sendiri/aset sendiri ditolak bila perlu.
