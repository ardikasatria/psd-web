# Langkah 26 — Akses Kernel Server (Permintaan & Manajemen Admin)

> **Tujuan:** Kernel **server** (Jupyter) hanya untuk pengguna dengan **grant aktif** yang
> disetujui admin — **terpisah dari gamifikasi**. Pengguna mengajukan lewat form; admin
> menyetujui/menolak/mencabut + menetapkan sumber daya & masa berlaku. **Browser/JupyterLite
> tetap terbuka untuk semua.** **Kerjakan setelah Langkah 22 (notebook) & 25 (gamifikasi).**
> Prasyarat: Langkah 11 (auth), 22 (notebook), 25 (perks).
>
> Logika inti **lulus 12 uji** di `psd-kernel-access/app/kernel_access/`.

---

## Yang harus PSD siapkan untuk kernel server (prasyarat infra)

Sebelum fitur ini berguna, sediakan (lihat juga LANGKAH_52/52B & DEPLOY):
1. **Penyedia kernel terisolasi per-pengguna** (DockerSpawner/KubeSpawner atau Kernel Gateway terisolasi).
2. **Image single-user** (CPU-only) berisi SDK `psd` + paket terpasang.
3. **Batas sumber daya per kernel** (cpu, mem, pids) + **idle-culling** + **umur maksimum**.
4. **Proxy WebSocket** `/api/kernels/{id}/channels` lewat auth PSD.
5. **Hitung kernel berjalan per pengguna** (untuk batas konkuren).
6. **Volume kerja persisten** + akses dataset via `psd://` presigned.
7. **Keamanan**: jangan ekspos `docker.sock` sembarangan; kebijakan egress; kelola rahasia.
8. **Hook saat dicabut/kedaluwarsa** → matikan kernel berjalan milik pengguna itu.

---

## 26.1 Model — `app/modules/kernel_access/models.py`

Satu tabel siklus hidup (permintaan + grant). Baris `approved` & belum kedaluwarsa = grant aktif.

```python
class KernelAccessRequest(Base):
    __tablename__ = "kernel_access_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True,
                                    default=lambda: f"kar_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    # keputusan admin
    decided_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # parameter grant (diisi saat approve)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_concurrent_kernels: Mapped[int] = mapped_column(Integer, default=1)
    cpu: Mapped[float] = mapped_column(Float, default=1.0)
    mem_gb: Mapped[float] = mapped_column(Float, default=2.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now())
```

```bash
docker compose exec backend alembic revision --autogenerate -m "kernel_access"
docker compose exec backend alembic upgrade head
```

Status: `pending | approved | denied | revoked | expired | canceled`. ("expired" dihitung
saat baca via `effective_status`; boleh juga di-set oleh job kedaluwarsa.)

---

## 26.2 Service/policy — `app/modules/kernel_access/service.py`

Cermin `psd-kernel-access/app/kernel_access/policy.py` (sudah teruji): `is_active`,
`effective_status`, `require_server_access`, `apply_decision`, `can_request`. Tambah query DB:

- `latest_request(db, user_id)` → permintaan terbaru pengguna.
- `active_grant(db, user_id, now)` → baris `approved` & `is_active` (untuk gating).
- `running_kernels(db/redis, user_id)` → jumlah kernel berjalan (seam ke penyedia kernel).
- Saat **approve/revoke/expire**: jika mencabut akses, **matikan kernel berjalan** pengguna
  (panggil KernelClient.shutdown — Langkah 52/52b).

---

## 26.3 Endpoint — `app/modules/kernel_access/router.py`

**Pengguna:**

| Method | Path | Aksi |
|---|---|---|
| POST | `/kernel-access/requests` | Buat permintaan `{reason}`. Tolak (409 `already_requested`/`already_granted`) bila `can_request` False. |
| GET | `/kernel-access/me` | Status terkini: `{status, grant: {active, expires_at, max_concurrent_kernels, cpu, mem_gb} | null, latest_request}`. |
| DELETE | `/kernel-access/requests/{id}` | Batalkan permintaan **pending** milik sendiri (`apply_decision(..., "cancel")`). |

**Admin** (guard `require_admin`):

| Method | Path | Aksi |
|---|---|---|
| GET | `/admin/kernel-access/requests?status=&page=` | Daftar (paginated) + info pengguna (username, tier dari Langkah 25). |
| POST | `/admin/kernel-access/requests/{id}/approve` | `{expires_at?, max_concurrent_kernels?, cpu?, mem_gb?, note?}` → status `approved` + isi parameter grant. |
| POST | `/admin/kernel-access/requests/{id}/deny` | `{note?}` → `denied`. |
| POST | `/admin/kernel-access/requests/{id}/revoke` | `{note?}` → `revoked` + **matikan kernel berjalan** pengguna. |
| GET | `/admin/kernel-access/grants?active=true&page=` | Daftar grant aktif. |

Semua keputusan set `decided_by/decided_at/decision_note`. Pakai `ApiError` & `paginated()` seperti modul lain.

---

## 26.4 Integrasi launch notebook (Langkah 22/52B)

Pada pemilihan runtime **server** (`service.launch` 52b), **sebelum** start kernel:

```python
from app.modules.kernel_access.service import active_grant, running_kernels
from app.kernel_access.policy import require_server_access

if runtime == "server":
    grant = await active_grant(db, user.id)                 # None bila tak ada
    limits = require_server_access(grant, running_count=await running_kernels(user.id))
    # limits = {cpu, mem_gb, max_concurrent_kernels} → pakai saat spawn kernel
```

- **Runtime browser**: TIDAK perlu grant (tetap terbuka; hanya tunduk kuota jumlah notebook gamifikasi).
- Jika `require_server_access` raise 403 → frontend tampilkan ajakan **"Minta akses kernel"**.

---

## 26.5 Interaksi dengan gamifikasi (Langkah 25) — pembagian yang jelas

| Aspek | Sumber |
|---|---|
| Jumlah notebook (`notebook_quota`) | **Gamifikasi** (perks tier) |
| Runtime browser (JupyterLite) | Terbuka semua |
| **Boleh pakai kernel server** | **Grant admin (fitur ini)** |
| Sumber daya kernel server (cpu/mem/konkuren/masa berlaku) | **Grant admin** |

Jadi tier gamifikasi TIDAK otomatis membuka kernel server — harus lewat persetujuan admin.
Admin boleh mempertimbangkan tier saat menyetujui (ditampilkan di daftar), tapi tak diwajibkan.

---

## 26.6 Pembaruan kontrak (Bagian 8)

- `GET /kernel-access/me` → status + grant.
- Endpoint admin approve/deny/revoke + daftar permintaan/grant.
- `service.launch` runtime server kini bergantung grant aktif.

---

## Selesai bila

- [ ] Pengguna dapat mengajukan akses kernel (form `reason`); satu permintaan tertunda/aktif saja.
- [ ] Admin dapat menyetujui (dengan sumber daya & masa berlaku), menolak, dan mencabut.
- [ ] Runtime **server** hanya jalan dengan grant aktif & dalam batas konkuren; **browser tetap bebas**.
- [ ] Mencabut/kedaluwarsa **mematikan kernel berjalan** pengguna.
- [ ] `GET /kernel-access/me` & daftar admin benar; keputusan tercatat (`decided_by/at/note`).
- [ ] Logika (cermin `psd-kernel-access/app/kernel_access/tests/`) hijau.

---

## Gotcha

- **Pisahkan dari gamifikasi**: jangan gabung `notebook_quota` (perks) dengan izin kernel server (grant).
- **Kedaluwarsa ditegakkan saat gating** (`is_active`), tak cukup mengandalkan job; tambah job pembersih opsional.
- **Cabut = matikan kernel** yang sedang jalan, jangan hanya ubah status.
- **Guard admin** wajib di seluruh endpoint `/admin/...`.
- **Audit**: simpan `decided_by/at/note` untuk jejak keputusan.
- **Idempoten approve/revoke**: tolak transisi tak sah (409) — sudah ditangani `apply_decision`.
