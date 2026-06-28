# PSD — Instruksi Cursor: Tim & Kolaborasi (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Direktori tim, halaman tim, anggota/peran, undangan, permintaan bergabung, dan aset milik tim. **Kerjakan setelah backend Langkah 37 & Notifikasi (Langkah 29).**

## 1. Skema & API

```ts
export const TeamSchema = z.object({ slug: z.string(), name: z.string(), description: z.string(),
  avatar_url: z.string().nullable(), visibility: z.enum(["public","private"]),
  my_role: z.enum(["owner","admin","member"]).nullable().optional(),
  members: z.array(z.object({ username: z.string(), name: z.string().nullable(),
    avatar_url: z.string().nullable(), role: z.string() })) });

// lib/api/teams.ts
export const createTeam = (b: any) => apiFetch(`/teams`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const listTeams = (q = "", page = 1) => apiFetch(`/teams?q=${encodeURIComponent(q)}&page=${page}`, PaginatedTeam);
export const getMyTeams = () => apiFetch(`/me/teams`, z.object({ items: z.array(z.any()) }));
export const getTeam = (slug: string) => apiFetch(`/teams/${slug}`, TeamSchema);
export const updateTeam = (slug: string, b: any) => apiFetch(`/teams/${slug}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const deleteTeam = (slug: string) => apiFetch(`/teams/${slug}`, z.any(), { method: "DELETE" });
export const setRole = (slug: string, username: string, role: string) => apiFetch(`/teams/${slug}/members/${username}`, z.any(), { method: "PATCH", body: JSON.stringify({ role }) });
export const removeMember = (slug: string, username: string) => apiFetch(`/teams/${slug}/members/${username}`, z.any(), { method: "DELETE" });
export const inviteMember = (slug: string, username: string) => apiFetch(`/teams/${slug}/invites`, z.any(), { method: "POST", body: JSON.stringify({ username }) });
export const getMyInvites = () => apiFetch(`/me/team-invites`, z.object({ items: z.array(z.any()) }));
export const respondInvite = (id: string, action: "accept" | "decline") => apiFetch(`/me/team-invites/${id}/${action}`, z.any(), { method: "POST" });
export const requestJoin = (slug: string) => apiFetch(`/teams/${slug}/join-request`, z.any(), { method: "POST" });
export const listJoinRequests = (slug: string) => apiFetch(`/teams/${slug}/join-requests`, z.object({ items: z.array(z.any()) }));
export const decideRequest = (slug: string, id: string, decision: "approve" | "reject") => apiFetch(`/teams/${slug}/join-requests/${id}/${decision}`, z.any(), { method: "POST" });
```

## 2. Direktori & buat tim

- `/teams`: pencarian + grid tim publik (nama, deskripsi, jumlah anggota). Tombol **Buat tim** (modal: nama, deskripsi, visibilitas) → `createTeam` → arahkan ke halaman tim.
- `/me/teams`: daftar tim saya + peran.

## 3. Halaman tim — `/teams/[slug]`

- Header: avatar, nama, deskripsi, visibilitas, jumlah anggota.
- **Anggota:** daftar + peran. Untuk **owner/admin**: ubah peran, keluarkan, transfer owner (konfirmasi), undang (input username → `inviteMember`).
- Tombol kondisional untuk non-anggota: tim publik → **Minta bergabung** (`requestJoin`); tim privat → info "perlu undangan".
- Anggota: tombol **Keluar** (`removeMember(slug, myUsername)`).
- Tab **Aset tim**: daftar repo/notebook milik tim (filter `team` di API aset).

## 4. Undangan & permintaan

- **Undangan saya:** di `/me/teams` atau lonceng — daftar dari `getMyInvites()` dengan Terima/Tolak (`respondInvite`).
- **Permintaan bergabung (owner/admin):** panel `/teams/[slug]/requests` dari `listJoinRequests()` → Setujui/Tolak (`decideRequest`). (Notifikasi sudah otomatis dari Langkah 29.)

## 5. Aset milik tim (kolaborasi)

- Di form buat aset (Repo/Notebook): opsi **Pemilik** = diri sendiri atau salah satu **tim saya** (kirim `team_id`).
- Pada kartu/detail aset: tampilkan badge tim ("oleh tim {name}") bila `team`. Semua anggota tim melihat tombol edit.

## 6. Handler MSW

Tambah handler tim (direktori, detail, anggota, undangan, permintaan) dengan skenario owner/admin/member/non-anggota; aset dengan `team`.

## 7. Definition of Done

- [ ] Buat & jelajah tim; "tim saya" + peran tampil.
- [ ] Owner/admin kelola anggota (peran, keluarkan, transfer, undang); member bisa keluar.
- [ ] Alur undangan & permintaan bergabung lengkap dengan notifikasi.
- [ ] Aset dapat dimiliki tim; anggota dapat mengeditnya; badge tim tampil.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
