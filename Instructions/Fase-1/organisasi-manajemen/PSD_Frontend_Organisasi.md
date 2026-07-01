# PSD — Instruksi Cursor: Organisasi (Sisi User, Sisi Organisasi, Sisi Admin)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun fitur organisasi: **user** (buat/gabung
> banyak org), **organisasi** (kelola anggota/tim/aset/akses/verifikasi/peluang), **admin platform**
> (verifikasi & moderasi org). **Awal Fase 2.** Prasyarat: backend Langkah 36.

## 1. Skema & API (ringkas)

```ts
export const ORG_TYPES = ["personal", "community", "academic", "umkm", "enterprise"] as const;
export const ORG_ROLES = ["owner", "admin", "member", "billing_manager"] as const;
export const ACCESS_LEVELS = ["read", "triage", "write", "maintain", "admin"] as const;

// lib/api/orgs.ts
export const createOrg = (b: { handle: string; name: string; type: string }) => apiFetch(`/orgs`, OrgSchema, { method: "POST", body: JSON.stringify(b) });
export const myOrgs = () => apiFetch(`/orgs/me`, z.array(OrgSchema));
export const getOrg = (handle: string) => apiFetch(`/orgs/${handle}`, OrgDetailSchema); // berisi my_role, type, verification
export const leaveOrg = (id: string) => apiFetch(`/orgs/${id}/leave`, z.any(), { method: "POST" });
// sisi org
export const inviteOrgMember = (id: string, username: string) => apiFetch(`/orgs/${id}/members/invite`, z.any(), { method: "POST", body: JSON.stringify({ username }) });
export const setOrgRole = (id: string, uid: string, role: string) => apiFetch(`/orgs/${id}/members/${uid}/role`, z.any(), { method: "POST", body: JSON.stringify({ role }) });
export const removeOrgMember = (id: string, uid: string) => apiFetch(`/orgs/${id}/members/${uid}`, z.any(), { method: "DELETE" });
export const createOrgTeam = (id: string, name: string) => apiFetch(`/orgs/${id}/teams`, z.any(), { method: "POST", body: JSON.stringify({ name }) });
export const setAssetGrant = (id: string, aid: string, b: { team_id?: string; user_id?: string; level: string }) => apiFetch(`/orgs/${id}/assets/${aid}/grants`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const updateOrgSettings = (id: string, b: object) => apiFetch(`/orgs/${id}/settings`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const submitVerification = (id: string, doc_keys: string[]) => apiFetch(`/orgs/${id}/verification`, z.any(), { method: "POST", body: JSON.stringify({ doc_keys }) });
export const createOpportunity = (id: string, b: object) => apiFetch(`/orgs/${id}/opportunities`, OpportunitySchema, { method: "POST", body: JSON.stringify(b) });
export const transferOrg = (id: string, uid: string) => apiFetch(`/orgs/${id}/transfer`, z.any(), { method: "POST", body: JSON.stringify({ user_id: uid }) });
export const deleteOrg = (id: string) => apiFetch(`/orgs/${id}`, z.any(), { method: "DELETE" });
// sisi admin platform
export const adminListOrgs = (q: object) => apiFetch(`/admin/orgs?...`, PaginatedOrg);
export const adminVerifyQueue = () => apiFetch(`/admin/orgs/verification?status=pending`, z.array(VerificationSchema));
export const adminApproveVerify = (id: string) => apiFetch(`/admin/orgs/${id}/verification/approve`, z.any(), { method: "POST" });
export const adminRejectVerify = (id: string, note: string) => apiFetch(`/admin/orgs/${id}/verification/reject`, z.any(), { method: "POST", body: JSON.stringify({ note }) });
export const adminSuspendOrg = (id: string) => apiFetch(`/admin/orgs/${id}/suspend`, z.any(), { method: "POST" });
```

## 2. Gating UI dari `my_role` (sejajar backend)

```ts
const ORG_PERMS = {
  owner: new Set(["view_org","manage_members","manage_teams","manage_assets","manage_settings","post_opportunity","manage_recruitment","manage_verification","manage_billing","delete_org","transfer_ownership"]),
  admin: new Set(["view_org","manage_members","manage_teams","manage_assets","manage_settings","post_opportunity","manage_recruitment","manage_verification"]),
  member: new Set(["view_org"]),
  billing_manager: new Set(["view_org","manage_billing"]),
};
export const orgCan = (role, action) => ORG_PERMS[role]?.has(action) ?? false;
```
> Server tetap penjaga sebenarnya; UI hanya menyembunyikan/menonaktifkan.

## 3. SISI USER

- **Buat organisasi** (`/orgs/new`): form handle (validasi klien: 3–39, huruf kecil/angka/hubung, tak
  diawali/diakhiri hubung, tak ganda) + nama + **tipe** (personal/community/academic/umkm/enterprise).
  Bila tipe umkm/enterprise → tampilkan info "perlu verifikasi untuk memasang peluang".
- **Organisasi saya**: daftar org (banyak) dengan peran masing-masing; tombol buat org baru (banyak).
- **Profil akun**: tampilkan badge organisasi yang diikuti.

## 4. SISI ORGANISASI (`/orgs/{handle}`)

Tab:
1. **Ikhtisar** — nama, tipe, **badge verifikasi** (verified/pending/unverified), deskripsi, aset publik.
2. **Anggota** — daftar + peran; undang/ubah peran/keluarkan (sesuai `orgCan`). **Owner terakhir**
   tak bisa dihapus/didemovasi (tombol nonaktif + tooltip).
3. **Tim** — tim dalam org + anggota; kelola (`manage_teams`).
4. **Aset** — aset milik org (jenis diperluas). **Akses** per aset: set grant tim/langsung (level
   read…admin). Tampilkan "akses efektif saya" dari `my-access`.
5. **Peluang** *(hanya tampil bila tipe umkm/enterprise)* — daftar & **Buat peluang**. Tombol buat
   **nonaktif bila belum `verified`** + ajakan verifikasi. Tab pelamar (`manage_recruitment`).
6. **Pengaturan** — profil, `base_permission`, **Verifikasi** (unggah dokumen → submit), **Tagihan**
   (owner/billing), **Transfer**/**Hapus** (owner).

## 5. SISI ADMIN PLATFORM (`/admin/orgs`)

- **Daftar org** (filter tipe/verifikasi).
- **Antrian verifikasi**: dokumen KYC (lihat via presigned), tombol **Setujui**/**Tolak** (+catatan)/
  **Cabut**. Setujui → org jadi `verified` (boleh pasang peluang).
- **Moderasi**: suspend/restore org yang menyalahgunakan.

## 6. Verifikasi (unggah dokumen)

- Form verifikasi: unggah dokumen (akta/NIB/NPWP/dll) via presigned MinIO → kumpulkan `doc_keys` →
  `submitVerification`. Status berubah ke **pending**; tampilkan banner status.

## 7. Handler MSW

Tambah handler semua endpoint, termasuk: createOrg (sukses + 422 handle/409 reserved), myOrgs, getOrg
(berbagai peran & status verifikasi), set/remove member (403 last-owner), grants & my-access (level efektif),
submitVerification, createOpportunity (sukses + 403 belum verified), admin approve/reject/suspend.

## 8. Definition of Done

- [ ] User membuat **banyak** org & tergabung di **banyak** org; peran tampil.
- [ ] Sisi org: kelola anggota/tim/aset (grant level), pengaturan, verifikasi, peluang — gating sesuai peran.
- [ ] **Owner terakhir** terlindungi di UI; aksi owner-only hanya untuk owner.
- [ ] Tombol "Buat peluang" nonaktif sampai org **verified** (umkm/enterprise).
- [ ] Sisi admin: antrian verifikasi (approve/reject/revoke) + suspend/restore.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
