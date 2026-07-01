# Langkah 35 — Backend Manajemen Tim Lengkap: Peran, Suksesi, Aset Diperluas, Diskusi + File

> **Tujuan:** Jadikan tim ruang kolaborasi & diskusi nyaman. Tambah peran **co-owner**, batasi aksi
> **owner-only**, **canManageTeamAsset** berbasis keanggotaan, **suksesi owner** otomatis, **jenis aset
> tim diperluas** (ruang ide/pabrik data/transformer/registry/data sintesis/ruang analitik), **tab
> diskusi**, dan **file** dalam ruang diskusi. **Kerjakan setelah modul Teams dasar.** Prasyarat: Teams,
> aset (15/31), kompetisi (32), notifikasi (29), MinIO.
>
> Logika inti **lulus 12 uji** di `psd-teams/app/teams/`.

## 1. Peran & izin (cermin `roles.py`)

| Aksi | owner | co-owner | member |
|---|:--:|:--:|:--:|
| kelola/buat aset tim (`manage_asset`) | ✅ | ✅ | ✅ |
| ikut diskusi (`post_discussion`) | ✅ | ✅ | ✅ |
| moderasi anggota (`moderate_members`) | ✅ | ✅ | ❌ |
| kelola diskusi (`manage_discussion`) | ✅ | ✅ | ❌ |
| undang/kick (`invite`/`kick`) | ✅ | ❌ | ❌ |
| hapus tim (`delete_team`) | ✅ | ❌ | ❌ |
| transfer kepemilikan | ✅ | ❌ | ❌ |

- `can(role, action)`, `require(role, action)` → 403.
- `can_manage_team_asset(role)` = **keanggotaan** (bukan owner-username aset). Pakai ini di detail
  repo/notebook/aset tim, bukan cek `asset.owner == username`.
- `can_set_role(actor, current, new)`: co-owner hanya member↔co-owner; menyentuh owner hanya owner (transfer).

## 2. Model (tambahan/penyesuaian)

```python
class TeamMember(Base):
    __tablename__ = "team_members"
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String, default="member")  # owner|co-owner|member
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamAsset(Base):                          # tim memiliki banyak jenis aset
    __tablename__ = "team_assets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ta_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    kind: Mapped[str] = mapped_column(String)   # project|model|dataset|notebook|idea_space|data_factory|transformer_space|model_registry|synthetic_data|analytics_space
    ref_id: Mapped[str] = mapped_column(String) # id entitas terkait
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamChannel(Base):                        # ruang diskusi (bisa >1 channel)
    __tablename__ = "team_channels"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ch_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    name: Mapped[str] = mapped_column(String, default="umum")

class TeamMessage(Base):
    __tablename__ = "team_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    channel_id: Mapped[str] = mapped_column(ForeignKey("team_channels.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamFile(Base):                           # file dalam ruang diskusi
    __tablename__ = "team_files"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"tf_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    channel_id: Mapped[str | None] = mapped_column(ForeignKey("team_channels.id"), nullable=True)
    message_id: Mapped[int | None] = mapped_column(ForeignKey("team_messages.id"), nullable=True)
    uploader_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    storage_key: Mapped[str] = mapped_column(String)   # key MinIO
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

```bash
docker compose exec backend alembic revision --autogenerate -m "team_collab"
docker compose exec backend alembic upgrade head
```

## 3. Endpoint — `app/modules/teams/router.py`

**Anggota & peran:**

| Method | Path | Guard |
|---|---|---|
| POST | `/teams/{id}/invite` | `require(role,"invite")` (owner) |
| POST | `/teams/{id}/members/{uid}/role` | `can_set_role(actor, current, new)` (owner; co-owner terbatas) |
| DELETE | `/teams/{id}/members/{uid}` | `require(role,"kick")` (owner) |
| DELETE | `/teams/{id}` | `require(role,"delete_team")` (owner) |
| POST | `/teams/{id}/transfer` | owner → set owner baru |
| POST | `/teams/{id}/leave` | Keluar; **bila owner keluar → `pick_successor` promosikan otomatis** (transfer), atau arsipkan bila kosong. |

**Aset tim:**

| Method | Path | Aksi |
|---|---|---|
| POST | `/teams/{id}/assets` | `require(role,"manage_asset")` + `validate_asset_kind` → buat aset (project/model/…/analytics_space). |
| GET | `/teams/{id}/assets?kind=` | Daftar aset tim. |

**Diskusi & file:**

| Method | Path | Aksi |
|---|---|---|
| GET | `/teams/{id}/channels` | Daftar channel. |
| POST | `/teams/{id}/channels` | `manage_discussion` → buat channel. |
| GET | `/teams/{id}/channels/{cid}/messages` | Riwayat pesan (paginated). |
| POST | `/teams/{id}/channels/{cid}/messages` | `can_post` + `validate_message` → kirim pesan (+lampiran). |
| POST | `/teams/{id}/files/presign` | `can_post` → presigned upload MinIO. |
| POST | `/teams/{id}/files` | `validate_attachment` → simpan `TeamFile` (rujuk pesan/channel). |
| GET | `/teams/{id}/files` | Daftar file ruang diskusi (unduh presigned). |

## 4. Suksesi owner (cermin `succession.py`)

- Saat owner `leave`/dihapus: `list_members_with_activity` → `pick_successor` (skor commit×3 +
  submission×2 + kontribusi×1 + pesan×0.1; seri → co-owner → join lebih awal) → `transfer_ownership`.
- Bila tak ada anggota lain → arsipkan/hapus tim sesuai kebijakan.

## 5. Kompetisi

- Form submit kompetisi (Langkah 32) memakai **picker tim**: tampilkan tim tempat user jadi anggota;
  submission `team_id` divalidasi keanggotaan via `member_role`.

## 6. Definition of Done

- [ ] Peran co-owner berfungsi (kelola aset + moderasi, tanpa hapus tim); owner-only ditegakkan di server.
- [ ] `canManageTeamAsset` berbasis keanggotaan dipakai di detail aset/notebook tim.
- [ ] Owner keluar → suksesi otomatis ke anggota teraktif.
- [ ] Aset tim mencakup semua jenis (termasuk ruang ide/pabrik data/transformer/registry/data sintesis/ruang analitik).
- [ ] Tab diskusi: channel + pesan; file tersimpan & terunduh (presigned), validasi ukuran/tipe.
- [ ] Picker tim di submit kompetisi (keanggotaan tervalidasi).
- [ ] Logika (cermin `psd-teams/app/teams/tests/`) hijau.

## 7. Gotcha

- **Pakai keanggotaan, bukan owner-username**, untuk izin aset tim (`can_manage_team_asset`).
- **Owner-only di server** (jangan hanya sembunyikan tombol): invite/kick/delete/transfer.
- **Co-owner tak bisa menyentuh owner** lewat `set_role`; transfer kepemilikan hanya owner.
- **Suksesi** harus jalan di transaksi yang sama dengan owner keluar (hindari tim tanpa owner).
- **File diskusi**: tolak ekstensi eksekusi, batasi ukuran, simpan di MinIO (presigned), jangan layani via backend langsung.
- **Visibilitas**: diskusi & file hanya untuk anggota tim.
