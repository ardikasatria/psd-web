# PSD — Instruksi Cursor: Statistik Engagement (Suka, Bagikan, Unduh) di Aset & Profil

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menambahkan baris statistik di **detail aset**
> (suka/bagikan/unduh, gaya Kaggle) dan **agregat di profil** (sumber tunggal, gaya total suka TikTok).
> **Kerjakan setelah auth cookie & sosial.** Prasyarat: backend Langkah 29.

## 1. Skema & API

```ts
export const AssetStatsSchema = z.object({
  love_count: z.number(), share_count: z.number(),
  shares: z.object({ feed: z.number(), forum: z.number(), external: z.number(), link: z.number() }),
  download_count: z.number(), view_count: z.number(), liked: z.boolean(),
});
export const UserStatsSchema = z.object({
  total_loves_received: z.number(), total_shares: z.number(),
  total_downloads: z.number(), total_views: z.number(), asset_count: z.number(),
});

// lib/api/engagement.ts
const a = (kind: string, slug: string) => `/assets/${kind}/${slug}`;
export const loveAsset = (k: string, s: string) =>
  apiFetch(`${a(k, s)}/love`, z.object({ liked: z.boolean(), love_count: z.number() }), { method: "POST" });
export const shareAsset = (k: string, s: string, channel: "feed" | "forum" | "external" | "link") =>
  apiFetch(`${a(k, s)}/share`, z.object({ share_count: z.number(), shares: z.record(z.number()) }),
    { method: "POST", body: JSON.stringify({ channel }) });
export const trackDownload = (k: string, s: string) =>
  apiFetch(`${a(k, s)}/download`, z.object({ download_count: z.number() }), { method: "POST" });
export const getAssetStats = (k: string, s: string) => apiFetch(`${a(k, s)}/stats`, AssetStatsSchema);
export const getUserStats = (u: string) => apiFetch(`/users/${u}/stats`, UserStatsSchema);
```

## 2. Baris statistik di detail aset — `AssetStatBar`

Tampilkan di tiap halaman detail aset (dataset/model/notebook/course/…). Komponen tunggal `AssetStatBar`:

- **Suka** ❤ — tombol toggle **optimistik** (`loveAsset`), tampil `love_count`. Jika aset milik sendiri,
  nonaktifkan dengan tooltip ("Tak bisa menyukai aset sendiri").
- **Bagikan** — tombol membuka menu saluran:
  - **Feed** → buka komposer feed dengan aset terlampir (`{kind, slug}`) (modul sosial) → setelah kirim,
    `shareAsset(channel="feed")` (atau backend mencatat saat post dibuat — hindari dobel; ikuti backend).
  - **Forum** → buka komposer forum dengan aset terlampir → `shareAsset("forum")`.
  - **Eksternal** → bagikan via `navigator.share` bila ada, jika tidak **Salin tautan** → `shareAsset("link")`
    atau `shareAsset("external")`.
- **Unduh** ⬇ — tombol unduh memanggil unduhan aset lalu `trackDownload` (atau backend mencatat di
  endpoint unduh — jangan dobel). Tampil `download_count`.
- **Dilihat** 👁 — tampilkan `view_count` (read-only).

Angka diformat ringkas (mis. 1.2rb, 3,4jt). Update optimistik untuk suka; untuk bagikan/unduh
perbarui dari respons.

## 3. Agregat di profil — `ProfileStats` (sumber tunggal)

Pada `/u/[username]`, header statistik dari `getUserStats(username)` (gaya Kaggle/TikTok):

- **Total suka diterima** (`total_loves_received`) — angka besar menonjol.
- **Total dibagikan** (`total_shares`), **Total diunduh** (`total_downloads`), **Aset** (`asset_count`),
  dan opsional **Total dilihat**.

Tampilkan sebagai deret angka besar + label. Ini **agregat tunggal** lintas semua aset pengguna — bukan
dihitung ulang di klien.

## 4. Handler MSW

Tambah handler: `getAssetStats` (beberapa skenario termasuk `liked:true/false` & aset milik sendiri),
`loveAsset` (toggle), `shareAsset` (naikkan saluran), `trackDownload`, `getUserStats` (agregat).

## 5. Definition of Done

- [ ] Tiap detail aset menampilkan suka/bagikan/unduh/dilihat; suka optimistik & idempoten.
- [ ] Bagikan mendukung feed/forum/eksternal/salin-tautan tanpa penghitungan dobel.
- [ ] Profil menampilkan agregat sumber tunggal (total suka/bagikan/unduh/aset).
- [ ] Aset milik sendiri tak bisa disukai (UI menonaktifkan).
- [ ] Angka diformat ringkas; konsisten antara detail aset & agregat profil.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
