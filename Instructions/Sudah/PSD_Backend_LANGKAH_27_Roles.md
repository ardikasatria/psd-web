# Langkah 27 — Penyempurnaan Roles & Hak Akses

> **Tujuan:** Pisahkan **jenis akun** (individu/organisasi) dari **peran platform** (member/moderator/superadmin), dan tegakkan hak akses berlapis. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 12 (admin).

## Konsep (inti)

Selama ini `role` mencampur dua hal. Kita pisahkan jadi dua sumbu ortogonal:

- **`account_type`** — *jenis* akun: `individual` | `organization`. (Bukan tingkat hak.)
- **`role`** — *tingkat staf platform*: `member` | `moderator` | `superadmin`.
  - `member` — pengguna biasa (default).
  - `moderator` — **humas**: kelola blog, pengumuman, featured, setujui instruktur, moderasi konten. **Tidak** bisa mengubah role/menghapus akun.
  - `superadmin` — kendali penuh: kelola pengguna & role, hapus akun, sistem.
- Plus *flag* lintas-sumbu yang sudah ada: `is_instructor`, `is_official`, `is_active`.

## 27.1 Field — `app/modules/users/models.py`

```python
account_type: Mapped[str] = mapped_column(String, default="individual")  # individual | organization
# role kini bernilai: member | moderator | superadmin (ganti default)
role: Mapped[str] = mapped_column(String, default="member")
```

Migrasi + pemetaan data lama:

```bash
docker compose exec backend alembic revision --autogenerate -m "account_type and roles"
docker compose exec backend alembic upgrade head
docker compose exec db psql -U psd -d psd -c "
UPDATE users SET account_type='organization' WHERE role='org_admin';
UPDATE users SET role='member' WHERE role IN ('user','org_admin');
UPDATE users SET role='superadmin' WHERE role='admin';
"
```

> Pastikan akun Anda superadmin: `UPDATE users SET role='superadmin' WHERE username='satria';`

## 27.2 Dependency hak akses — `app/core/deps.py`

```python
STAFF = {"moderator", "superadmin"}

async def require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in STAFF:
        raise ApiError(403, "forbidden", "Khusus staf (humas/superadmin)")
    return user

async def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "superadmin":
        raise ApiError(403, "forbidden", "Khusus super admin")
    return user
```

> `require_instructor` (Langkah 20) tetap; sesuaikan cek admin di dalamnya: `user.role in STAFF` atau `is_instructor`.

## 27.3 Terapkan di endpoint admin (Langkah 12, 18, 20)

Ganti `dependencies=[Depends(require_admin)]` di router admin menjadi **`require_staff`** (akses dasar humas), lalu **kunci ekstra** endpoint sensitif dengan `require_superadmin`:

| Area | Dep |
|---|---|
| Statistik, daftar konten | `require_staff` |
| Pengumuman, featured, blog (Langkah 28) | `require_staff` |
| Setujui instruktur, moderasi forum/postingan/event/course | `require_staff` |
| **Daftar/ubah role/aktif/hapus pengguna** | `require_superadmin` |
| Ground truth kompetisi | `require_staff` |

Contoh kunci ekstra pada endpoint pengguna:

```python
@router.patch("/admin/users/{user_id}", dependencies=[Depends(require_superadmin)])
@router.delete("/admin/users/{user_id}", dependencies=[Depends(require_superadmin)])
```

`PATCH /admin/users/{id}` menerima `role` ∈ `member|moderator|superadmin`.

## 27.4 OwnerRef dari account_type

Di **semua** serializer owner (`to_summary` repos, `_owner`/`_nb_owner` sosial/notebook, leaderboard, dll.) ganti penentuan tipe:

```python
"type": "org" if u.account_type == "organization" else "user"
```

(hapus pengecekan lama `role == "org_admin"`). Sertakan `account_type` di profil.

## 27.5 Pembaruan Kontrak (Bagian 8)

- `User`/profil **+** `account_type: "individual"|"organization"`; `role` ∈ `member|moderator|superadmin`.
- `OwnerRef.type` diturunkan dari `account_type`.
- `PATCH /admin/users/{id}` (superadmin) menerima `role` baru; endpoint pengguna kini superadmin-only.
- Endpoint humas lainnya: moderator **atau** superadmin.

## Selesai bila

- [ ] Data lama termigrasi: organisasi → `account_type=organization`; `admin`→`superadmin`; sisanya `member`.
- [ ] Moderator bisa akses tugas humas tetapi **tidak** bisa mengubah role/menghapus pengguna; superadmin bisa semua.
- [ ] `OwnerRef.type` benar untuk organisasi tanpa bergantung pada role.
- [ ] Akun Anda `superadmin`; minimal satu akun organisasi (`psd`) ber-`account_type=organization`.
