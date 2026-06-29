# PSD — Instruksi Cursor: Panel Penemuan Komunitas (`/community`)

> **Cara pakai:** Lampirkan bersama dokumen Sosial Komunitas. Menambahkan panel **penemuan orang**
> di samping feed: tier teratas, pencapaian, populer, anggota baru, dan **orang serupa** (sesama
> institusi/organisasi). **Kerjakan setelah feed sosial (Langkah 24) & gamifikasi (Langkah 25).**
> Prasyarat: backend Langkah 28.

## 1. Skema & API

```ts
export const DiscoveryRefSchema = z.object({
  username: z.string(), type: z.enum(["user", "org"]),
  avatar_url: z.string().nullable(), is_official: z.boolean(),
  reputation: z.number(), tier: z.string().nullable(), reason: z.string(),
});
export const DiscoveryPanelsSchema = z.object({
  top_tier: z.array(DiscoveryRefSchema),
  popular: z.array(DiscoveryRefSchema),
  new_members: z.array(DiscoveryRefSchema),
  achievements: z.array(DiscoveryRefSchema),
  affiliation: z.array(DiscoveryRefSchema),
});

// lib/api/discovery.ts
export const getDiscoveryPanels = (limit = 8) =>
  apiFetch(`/discovery/panels?limit=${limit}`, DiscoveryPanelsSchema);
export const getDiscoveryList = (kind: "top-tier" | "popular" | "new" | "achievements" | "similar", page = 1) =>
  apiFetch(`/discovery/${kind}?page=${page}`, PaginatedDiscovery);
```

## 2. Panel di `/community` (kolom samping)

Tampilkan `getDiscoveryPanels()` sebagai beberapa kartu ringkas di sidebar feed. Urutan saran
(personalisasi): **Sesama [afiliasi]** dulu bila ada, lalu **Tier teratas**, **Populer**, **Pencapaian**,
**Anggota baru**.

Komponen **`PeoplePanel`** (reusable) per kategori:
- Judul kategori + tautan **"Lihat semua"** → halaman daftar (bagian 4).
- Daftar **`PersonRow`**: avatar, nama (badge resmi bila `is_official`), **chip alasan** (`reason`,
  mis. "Tier Master", "1.2rb pengikut", "Sesama Institut Teknologi Sumatera", "Anggota baru",
  "Meraih Juara"), dan tombol **Ikuti** (pakai `followUser` dari modul sosial; optimistik).
- Maks ~5 baris per panel di sidebar.

Panel **Sesama [afiliasi]**:
- Judul dinamis dari `reason` entri pertama (mis. "Dari Institut Teknologi Sumatera").
- **Sembunyikan** bila `affiliation` kosong (anonim atau tanpa afiliasi) → jangan tampilkan kartu kosong.

State loading (skeleton), kosong (sembunyikan panel itu), error (diam—jangan ganggu feed).

## 3. `PersonRow` & follow

- Klik nama/avatar → `/u/[username]`.
- Tombol **Ikuti/Mengikuti** (toggle) memakai `followUser`/`unfollowUser` (modul sosial); setelah
  diikuti dari panel afiliasi, boleh hilangkan dari daftar (sudah jadi koneksi).
- Bila belum login → arahkan login.

## 4. Halaman "Lihat semua" — `/community/discovery/[kind]`

Daftar paginated (`getDiscoveryList(kind)`) memakai `PersonRow` yang sama. `kind`:
`top-tier` | `popular` | `new` | `achievements` | `similar`. Judul & subjudul sesuai kategori.

## 5. Handler MSW

Tambah handler: `getDiscoveryPanels` (isi kelima panel dengan beberapa orang + `reason`; sertakan
skenario `affiliation` kosong), `getDiscoveryList` per kind (paginated), dan pastikan `followUser`
sudah ada dari modul sosial.

## 6. Definition of Done

- [ ] Panel tier/populer/pencapaian/baru tampil di `/community` dengan chip alasan.
- [ ] Panel **Sesama [afiliasi]** muncul untuk pengguna ber-afiliasi; tersembunyi bila kosong.
- [ ] Tombol Ikuti bekerja (optimistik) dari setiap panel; diri sendiri tak pernah muncul.
- [ ] "Lihat semua" paginated per kategori.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
