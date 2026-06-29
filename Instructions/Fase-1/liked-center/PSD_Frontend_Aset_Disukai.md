# PSD — Instruksi Cursor: Aset Disukai (Profil) + Kontrol Visibilitas

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menampilkan **aset yang disukai** pengguna di
> profil (bukan feed/forum) dan kontrol **publik/privat** (master + per-item). **Kerjakan setelah
> sosial & statistik engagement.** Prasyarat: backend Langkah 30.

## 1. Skema & API

```ts
export const LikedAssetSchema = z.object({
  kind: z.string(), slug: z.string(), title: z.string(),
  owner: OwnerRefSchema, stats: z.object({ love_count: z.number(), download_count: z.number() }).partial(),
  is_public: z.boolean(), liked_at: z.string(),
});
export const LikedSummarySchema = z.object({
  list_public: z.boolean(), public_count: z.number(), total_count: z.number(),
});

// lib/api/liked.ts
export const getMyLiked = (page = 1) => apiFetch(`/me/liked-assets?page=${page}`, PaginatedLiked);
export const getUserLiked = (u: string, page = 1) => apiFetch(`/users/${u}/liked-assets?page=${page}`, PaginatedLiked);
export const getLikedSummary = (u: string) => apiFetch(`/users/${u}/liked-assets/summary`, LikedSummarySchema);
export const setItemVisibility = (kind: string, slug: string, is_public: boolean) =>
  apiFetch(`/me/liked-assets/${kind}/${slug}/visibility`, z.object({ is_public: z.boolean() }),
    { method: "PATCH", body: JSON.stringify({ is_public }) });
export const setLikedListSettings = (b: { list_public?: boolean; default_public?: boolean }) =>
  apiFetch(`/me/settings/liked-list`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
```

## 2. Tab profil "Aset Disukai" — `/u/[username]` & `/me`

- Tab **Disukai** di samping Postingan/Aset. Memuat `getUserLiked(username)` (untuk orang lain) atau
  `getMyLiked()` (diri sendiri).
- Tiap item = **kartu aset** (judul, kind, pemilik, statistik suka/unduh) → tautan ke detail aset.
- **Hanya aset** (dataset/model/notebook/course/…); feed & forum tak muncul.

**Untuk orang lain:**
- Bila daftar **privat** (`list_public=false`), tampilkan state "Daftar suka pengguna ini privat" — jangan
  tampilkan item.
- Bila publik, hanya item publik yang muncul (sudah difilter backend).

**Untuk diri sendiri (mode kelola):**
- Toggle **master**: "Tampilkan daftar suka saya ke publik" (`setLikedListSettings({list_public})`).
- Toggle **default**: "Aset yang saya sukai bersifat publik secara default" (`{default_public}`).
- Tiap item punya **switch publik/privat** (`setItemVisibility`) dengan ikon mata; optimistik.
- Tampilkan ringkasan: "X dari Y aset publik" (`getLikedSummary`).

## 3. Penanda di detail aset (opsional, kecil)

Di tombol Suka pada detail aset (Langkah 29), bila sudah disukai, tampilkan ikon kecil "di daftar suka
Anda" + pintasan toggle publik/privat untuk item itu (memakai `setItemVisibility`).

## 4. Handler MSW

Tambah handler: `getMyLiked` (campuran publik/privat), `getUserLiked` (hanya publik; juga skenario daftar
privat → kosong), `getLikedSummary`, `setItemVisibility` (toggle), `setLikedListSettings`.

## 5. Definition of Done

- [ ] Tab "Aset Disukai" tampil di profil; hanya aset (bukan feed/forum).
- [ ] Pemilik melihat semua + bisa atur master & per-item publik/privat (optimistik).
- [ ] Orang lain hanya melihat item publik; daftar privat → state privat, bukan bocor.
- [ ] Ringkasan "X dari Y publik" akurat; default item baru mengikuti pengaturan.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
