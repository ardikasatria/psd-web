# PSD — Instruksi Cursor: Ruang Ide — Tantang & Publikasi

> **Cara pakai:** Lampirkan bersama dokumen frontend. Dari ruang `finished`: buat kompetisi penantang & publikasikan aset dengan provenance. **Kerjakan setelah backend Langkah 42 & Ruang Ide Solusi (Langkah 41).**

## 1. Skema & API

`CompetitionSchema`/`RepoSchema` **+** `room_id: z.string().nullable().optional()`; `RepoDetailSchema` **+** `from_room: z.string().nullable().optional()`.

```ts
// lib/api/rooms.ts
export const challengeRoom = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/challenge`, z.object({ competition_slug: z.string(), status: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const publishAssets = (slug: string, b: any) => apiFetch(`/idea-rooms/${slug}/publish-assets`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const getRoomAssets = (slug: string) => apiFetch(`/idea-rooms/${slug}/assets`, z.object({ items: z.array(z.object({ type: z.string(), slug: z.string(), name: z.string(), visibility: z.string(), synthetic: z.boolean() })) }));
```

## 2. Panel pasca-selesai — saat status `finished`

Tampilkan panel master dengan dua aksi:

**A — Publikasikan aset:**
- Daftar aset ruang (`getRoomAssets`) dengan centang + pilih **visibilitas** (publik/privat) → `publishAssets({ assets, visibility })`.
- Aset sintesis tetap berlabel **Data Sintesis**; ingatkan singkat agar tidak disalahartikan sebagai data resmi.

**B — Jadikan tantangan:**
- Form: judul kompetisi, sponsor (opsional), metrik (default dari masalah), durasi (hari), tag.
- `challengeRoom` → arahkan ke halaman kompetisi baru (`/competitions/{competition_slug}`); ruang → `challenged`.

## 3. Status `challenged`

- Tampilkan badge "Ditantangkan" + tautan ke kompetisi.
- Aset publik tetap dapat dipublikasikan/diubah visibilitasnya.

## 4. Provenance pada halaman aset

Pada detail aset (`/[kind]/[owner]/[name]`), bila `from_room`/`room_id` terisi, tampilkan chip **"Dari Ruang Ide"** yang menautkan ke `/idea-rooms/{slug}`. (Resolusi slug via field yang dikembalikan backend atau lookup ringkas.)

## 5. Handler MSW

Tambah handler challenge (kembalikan competition_slug), publish-assets, dan assets. Sediakan ruang `finished` contoh dengan beberapa aset.

## 6. Definition of Done

- [ ] Dari ruang finished, master membuat kompetisi penantang → ruang `challenged` + tautan kompetisi.
- [ ] Publikasi aset mengubah visibilitas; aset sintesis tetap berlabel.
- [ ] Halaman aset menampilkan chip provenance "Dari Ruang Ide".
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.

> **Ruang Ide lengkap di frontend (Langkah 39–42).** Pastikan navigasi siklus mulus: direktori → ruang → framing → masalah/data → solusi → submit → finish → tantang/publikasi.
