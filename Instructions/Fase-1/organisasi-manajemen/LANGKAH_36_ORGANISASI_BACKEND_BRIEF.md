# Langkah 36 — Backend Organisasi: Tata Kelola (GitHub + HF) + Lapisan Talenta↔UMKM/Enterprise

> **Tujuan:** Fitur organisasi sebagai **gerbang UMKM/enterprise** masuk PSD. Tata kelola memadukan
> **GitHub org** (peran owner/admin/member, teams, level akses aset) + **Hugging Face org** (level
> read/write/admin, verifikasi/enterprise) + **lapisan khas PSD** (tipe org, verifikasi KYC ringan,
> posting **peluang** & **rekrutmen talenta**). User buat akun → boleh **tergabung di banyak** org &
> **membuat banyak** org. **Awal Fase 2.** Prasyarat: akun, teams (35), aset (31), verifikasi/admin, MinIO.
>
> Logika inti **lulus 11 uji** di `psd-orgs/app/orgs/`.

## 1. Konsep tata kelola

- **Peran org** (`roles.py`): owner > admin > member; `billing_manager`. Multi-owner diizinkan.
  Invariant: **minimal 1 owner** (tak bisa demovasi/hapus owner terakhir — `membership.py`).
- **Level akses aset** (`access.py`): read < triage < write < maintain < admin. **Izin efektif = MAKS**
  dari base permission org + grant via tim + grant langsung (resource group). owner/admin → admin.
- **Tipe & verifikasi** (`org_types.py`): personal/community/academic/umkm/enterprise; verifikasi
  unverified→pending→verified|rejected. **Posting peluang/rekrutmen hanya untuk umkm/enterprise (+academic)
  yang VERIFIED.**

## 2. Model

```python
class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"org_{uuid.uuid4().hex[:12]}")
    handle: Mapped[str] = mapped_column(String, unique=True, index=True)   # validate_handle
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="community")          # ORG_TYPES
    verification: Mapped[str] = mapped_column(String, default="unverified") # unverified|pending|verified|rejected
    base_permission: Mapped[str | None] = mapped_column(String, nullable=True)  # akses default member ke aset org
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class OrgMember(Base):
    __tablename__ = "org_members"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String, default="member")             # ORG_ROLES
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class OrgTeam(Base):                              # tim DI DALAM org (akses aset bertingkat)
    __tablename__ = "org_teams"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ot_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)

class OrgTeamMember(Base):
    __tablename__ = "org_team_members"
    team_id: Mapped[str] = mapped_column(ForeignKey("org_teams.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)

class OrgAssetGrant(Base):                        # grant level aset (tim atau langsung)
    __tablename__ = "org_asset_grants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    asset_id: Mapped[str] = mapped_column(String, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("org_teams.id"), nullable=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    level: Mapped[str] = mapped_column(String)    # read|triage|write|maintain|admin

class OrgVerificationRequest(Base):              # dokumen KYC ringan
    __tablename__ = "org_verification_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"vr_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    doc_keys: Mapped[str] = mapped_column(Text)   # JSON: key MinIO dokumen (akta/NIB/NPWP/dll)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

class Opportunity(Base):                          # PELUANG (sisi UMKM/enterprise → talenta)
    __tablename__ = "opportunities"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"op_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    skills: Mapped[str] = mapped_column(Text)     # JSON tags
    status: Mapped[str] = mapped_column(String, default="open")  # open|closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

```bash
docker compose exec backend alembic revision --autogenerate -m "organizations"
docker compose exec backend alembic upgrade head
```

## 3. Service (cermin scaffold teruji)

`roles.can/require/can_set_role`; `access.resolve_asset_level/is_at_least`; `org_types.apply_verification/
can_post_opportunity/validate_org_type`; `membership.validate_handle/can_remove_member/can_change_role/
can_create_org`.

## 4. Endpoint — SISI USER `app/modules/orgs/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/orgs` | Buat org (`validate_handle` + `validate_org_type`; `can_create_org` vs cap paket). Pembuat → **owner**. |
| GET | `/orgs/me` | Daftar org yang user ikuti (banyak). |
| GET | `/orgs/{handle}` | Profil org publik (+ `my_role` bila anggota). |
| POST | `/orgs/{handle}/leave` | Keluar (cek bukan owner terakhir). |

## 5. Endpoint — SISI ORGANISASI (guard peran via `require`)

| Method | Path | Guard/aksi |
|---|---|---|
| POST | `/orgs/{id}/members/invite` | `manage_members` (owner/admin) → undang. |
| POST | `/orgs/{id}/members/{uid}/role` | `can_set_role` + `can_change_role` (last-owner). |
| DELETE | `/orgs/{id}/members/{uid}` | `manage_members` + `can_remove_member`. |
| POST | `/orgs/{id}/teams` / `.../teams/{tid}/members` | `manage_teams`. |
| POST | `/orgs/{id}/assets` | `manage_assets` → buat aset milik org (jenis diperluas seperti Langkah 35). |
| POST | `/orgs/{id}/assets/{aid}/grants` | `manage_assets` → set grant tim/langsung (level). |
| GET | `/orgs/{id}/assets/{aid}/my-access` | `resolve_asset_level` untuk pemanggil. |
| PATCH | `/orgs/{id}/settings` | `manage_settings` (nama, deskripsi, `base_permission`). |
| POST | `/orgs/{id}/billing/...` | `manage_billing` (owner/billing_manager). |
| POST | `/orgs/{id}/transfer` | `transfer_ownership` (owner). |
| DELETE | `/orgs/{id}` | `delete_org` (owner). |
| POST | `/orgs/{id}/verification` | `manage_verification` → unggah dokumen (MinIO) → `apply_verification("submit")`. |
| POST | `/orgs/{id}/opportunities` | `post_opportunity` **+ `can_post_opportunity(type, verification)`** → buat peluang. |
| GET | `/orgs/{id}/opportunities` | Daftar peluang org. |
| GET | `/orgs/{id}/applications` | `manage_recruitment` → pelamar peluang. |

## 6. Endpoint — SISI ADMIN PLATFORM (super-admin, `require_platform_admin`)

| Method | Path | Aksi |
|---|---|---|
| GET | `/admin/orgs?type=&verification=` | Daftar/cari org. |
| GET | `/admin/orgs/verification?status=pending` | Antrian verifikasi. |
| POST | `/admin/orgs/{id}/verification/approve` | `apply_verification("approve")` → set `verified`. |
| POST | `/admin/orgs/{id}/verification/reject` | `apply_verification("reject")` + catatan. |
| POST | `/admin/orgs/{id}/verification/revoke` | `apply_verification("revoke")`. |
| POST | `/admin/orgs/{id}/suspend` / `/restore` | Moderasi org (penyalahgunaan). |

## 7. Definition of Done

- [ ] User buat akun → bisa **membuat banyak** org & **tergabung di banyak** org.
- [ ] Peran owner/admin/member/billing ditegakkan server; multi-owner; **owner terakhir terlindungi**.
- [ ] Akses aset org = MAKS(base, tim, langsung); owner/admin → admin.
- [ ] Tipe org + verifikasi (ajukan→approve/reject); **peluang hanya umkm/enterprise terverifikasi**.
- [ ] Admin platform mengelola verifikasi & moderasi org.
- [ ] Logika (cermin `psd-orgs/app/orgs/tests/`) hijau.

## 8. Gotcha

- **Owner terakhir**: tegakkan invariant di server pada leave/remove/demote (hindari org tanpa owner).
- **Izin efektif = MAKS**, bukan peran tunggal — jangan lupa grant tim/langsung saat resolve.
- **Verifikasi gerbang pasar**: `can_post_opportunity` wajib dicek sebelum buat peluang (cegah org tak terverifikasi merekrut).
- **Dokumen KYC** simpan di MinIO privat (presigned, akses admin saja); jangan publik.
- **Handle**: validasi & unik; tolak reserved & huruf besar (normalisasi di klien, validasi di server).
- **Pemisahan tata kelola**: org-role (governance) ≠ asset-level (akses) — dua sumбер kebenaran berbeda.
