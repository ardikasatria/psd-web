# PSD — Instruksi Cursor: Halaman Tim (Kolaborasi, Peran, Diskusi + File)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menyempurnakan `/teams/{slug}`: kolaborasi aset,
> peran co-owner, aksi owner-only, **tab Diskusi + File**, dan picker tim di submit kompetisi.
> **Kerjakan setelah Teams dasar, detail aset, & kompetisi.** Prasyarat: backend Langkah 35.

## 1. Skema & API

```ts
export const TEAM_ROLES = ["owner", "co-owner", "member"] as const;
export const TEAM_ASSET_KINDS = ["project", "model", "dataset", "notebook", "idea_space",
  "data_factory", "transformer_space", "model_registry", "synthetic_data", "analytics_space"] as const;

// lib/api/teams.ts
export const getTeam = (slug: string) => apiFetch(`/teams/${slug}`, TeamSchema); // berisi my_role
export const inviteMember = (id: string, username: string) => apiFetch(`/teams/${id}/invite`, z.any(), { method: "POST", body: JSON.stringify({ username }) });
export const setMemberRole = (id: string, uid: string, role: string) => apiFetch(`/teams/${id}/members/${uid}/role`, z.any(), { method: "POST", body: JSON.stringify({ role }) });
export const kickMember = (id: string, uid: string) => apiFetch(`/teams/${id}/members/${uid}`, z.any(), { method: "DELETE" });
export const leaveTeam = (id: string) => apiFetch(`/teams/${id}/leave`, z.any(), { method: "POST" });
export const transferOwner = (id: string, uid: string) => apiFetch(`/teams/${id}/transfer`, z.any(), { method: "POST", body: JSON.stringify({ user_id: uid }) });
export const createTeamAsset = (id: string, kind: string) => apiFetch(`/teams/${id}/assets`, AssetSchema, { method: "POST", body: JSON.stringify({ kind }) });
export const listTeamAssets = (id: string, kind?: string) => apiFetch(`/teams/${id}/assets${kind ? `?kind=${kind}` : ""}`, z.array(AssetSchema));
// diskusi & file
export const listChannels = (id: string) => apiFetch(`/teams/${id}/channels`, z.array(ChannelSchema));
export const listMessages = (id: string, cid: string, page = 1) => apiFetch(`/teams/${id}/channels/${cid}/messages?page=${page}`, PaginatedMessage);
export const postMessage = (id: string, cid: string, body: { body?: string; file_ids?: string[] }) => apiFetch(`/teams/${id}/channels/${cid}/messages`, MessageSchema, { method: "POST", body: JSON.stringify(body) });
export const presignFile = (id: string, filename: string) => apiFetch(`/teams/${id}/files/presign`, PresignSchema, { method: "POST", body: JSON.stringify({ filename }) });
export const registerFile = (id: string, meta: object) => apiFetch(`/teams/${id}/files`, FileSchema, { method: "POST", body: JSON.stringify(meta) });
export const listFiles = (id: string) => apiFetch(`/teams/${id}/files`, z.array(FileSchema));
```

## 2. Gating UI dari `my_role`

Buat helper klien sejajar backend:
```ts
const PERMS = {
  owner: new Set(["manage_asset","post_discussion","moderate_members","manage_discussion","invite","kick","delete_team","transfer_ownership"]),
  "co-owner": new Set(["manage_asset","post_discussion","moderate_members","manage_discussion"]),
  member: new Set(["manage_asset","post_discussion"]),
};
export const can = (role, action) => PERMS[role]?.has(action) ?? false;
export const canManageTeamAsset = (role) => ["owner","co-owner","member"].includes(role);
```
> Server tetap penjaga sebenarnya; UI hanya menyembunyikan/menonaktifkan. **Jangan** andalkan UI saja.

## 3. Tab halaman tim

1. **Ikhtisar** — info tim, anggota + peran, tombol cepat.
2. **Aset** — daftar aset tim (semua jenis). Tombol **Buat aset** (dropdown jenis: proyek/model/dataset/
   notebook/ruang ide/pabrik data/ruang transformer/registry model/data sintesis/ruang analitik) →
   `createTeamAsset` → arahkan ke detail aset. Tampil bila `can(role,"manage_asset")`.
3. **Diskusi** — daftar channel + area chat (pesan kronologis, komposer). Kirim teks + lampiran.
   Tombol **Buat channel** bila `can(role,"manage_discussion")`.
4. **File** — semua file dalam ruang diskusi (nama, pengunggah, ukuran, tanggal) + unduh (presigned) +
   pratinjau bila memungkinkan.
5. **Anggota** — kelola peran (sesuai izin): ubah member↔co-owner; **undang/kick/transfer hanya owner**.

## 4. Kolaborasi aset (penting)

- Di **detail repo/notebook/aset tim**, tombol edit/kelola muncul bila **`canManageTeamAsset(my_role)`**
  (keanggotaan), **bukan** hanya bila username = owner aset. Ambil `my_role` dari konteks tim aset.

## 5. Diskusi + file

- Komposer: teks + tombol lampirkan. Unggah: `presignFile` → PUT ke URL presigned → `registerFile` →
  sertakan `file_ids` saat `postMessage`.
- Validasi klien: tolak file kosong & ekstensi eksekusi (.exe/.sh/...); hormati batas ukuran (tampilkan 413).
- Pesan kosong tanpa lampiran → tombol kirim nonaktif.

## 6. Aksi owner-only & suksesi

- Tombol **Undang/Kick/Hapus tim/Transfer** hanya tampil untuk owner.
- Saat **owner menekan Keluar**: tampilkan dialog "Kepemilikan akan dialihkan ke anggota teraktif"
  (backend `pick_successor`); konfirmasi → `leaveTeam`. Bila owner satu-satunya anggota → peringatan tim akan diarsipkan.

## 7. Picker tim di submit kompetisi

- Form submit kompetisi (Langkah 32): dropdown **Submit sebagai** → tim yang Anda ikuti (atau Solo).
  Kirim `team_id` bila tim dipilih.

## 8. Handler MSW

Tambah handler semua endpoint, termasuk: peran (owner/co-owner/member) untuk gating; createTeamAsset
(semua jenis); channels/messages; presign+register file (sukses, 413, 415); leave-as-owner (suksesi);
transfer; setMemberRole (403 saat co-owner menyentuh owner).

## 9. Definition of Done

- [ ] Tombol "Buat aset" di tim (semua jenis); detail aset memakai `canManageTeamAsset` (keanggotaan).
- [ ] Peran co-owner terlihat & gating sesuai; owner-only hanya untuk owner.
- [ ] Tab **Diskusi** (channel + chat) & **File** (unggah/unduh presigned) berfungsi.
- [ ] Owner keluar → dialog suksesi; transfer kepemilikan tersedia.
- [ ] Picker tim di submit kompetisi.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
