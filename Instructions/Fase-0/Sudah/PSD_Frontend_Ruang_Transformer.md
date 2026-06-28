# PSD — Instruksi Cursor: Ruang Transformer — Koleksi & Hub (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Halaman koleksi kurasi + hub Transformer. **Kerjakan setelah backend Langkah 43, Kategori (33), Konten Kurasi (18).**

## 1. Skema & API

```ts
export const CollectionItemSchema = z.union([
  z.object({ type: z.enum(["model","dataset","project"]), slug: z.string(), name: z.string(), owner: z.string(), likes: z.number(), downloads: z.number() }),
  z.object({ type: z.literal("notebook"), id: z.string(), title: z.string() }),
]);
export const CollectionSchema = z.object({ slug: z.string(), title: z.string(), cover_url: z.string().nullable(),
  is_featured: z.boolean(), count: z.number(), description_md: z.string().optional(),
  items: z.array(CollectionItemSchema).optional() });
export const HubSchema = z.object({
  category: z.object({ slug: z.string(), name: z.string(), description: z.string() }).nullable(),
  collections: z.array(CollectionSchema), models: z.array(z.any()), datasets: z.array(z.any()),
  notebooks: z.array(z.object({ id: z.string(), title: z.string() })) });

// lib/api/collections.ts
export const listCollections = (q: any = {}) => apiFetch(`/collections?${new URLSearchParams(q)}`, PaginatedCollection);
export const getCollection = (slug: string) => apiFetch(`/collections/${slug}`, CollectionSchema);
export const createCollection = (b: any) => apiFetch(`/collections`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const updateCollection = (slug: string, b: any) => apiFetch(`/collections/${slug}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const deleteCollection = (slug: string) => apiFetch(`/collections/${slug}`, z.any(), { method: "DELETE" });
export const getTransformerHub = () => apiFetch(`/hub/transformer`, HubSchema);
```

## 2. Hub Transformer — `/transformer`

Landing kurasi (tautkan dari nav utama & halaman discover):
- **Hero**: nama & deskripsi kategori; satu kalimat posisi lokal ("Model & dataset Transformer berkonteks Indonesia").
- **Koleksi unggulan**: kartu dari `collections` (cover, judul, jumlah item) → `/collections/[slug]`.
- **Tab/baris**: Model teratas, Dataset teratas, Notebook — dari `models`/`datasets`/`notebooks`. Pakai kartu aset yang sudah ada.
- Bila `category === null`: tampilkan keadaan kosong ramah ("Segera hadir") tanpa error.

## 3. Daftar & detail koleksi

- `/collections` — grid koleksi (filter `?featured=true` & kategori). Kartu: cover, judul, jumlah item, badge "Unggulan".
- `/collections/[slug]` — header (cover, judul, deskripsi markdown) + grid item ter-resolusi (model/dataset/project/notebook) memakai kartu aset masing-masing.

## 4. Kelola koleksi (staf)

Bila pengguna staf (moderator/superadmin):
- Tombol **Buat koleksi** → form (judul, deskripsi, cover URL, kategori via `CategoryPicker`, toggle unggulan).
- **Tambah/atur item**: cari aset (reuse pencarian Langkah 16) → tambah `{type, slug|id}` ke `items` → `updateCollection`. Urutkan/hapus item.
- Sunting/hapus koleksi.

## 5. Handler MSW

Tambah handler collections (list/detail/CRUD) & `/hub/transformer` dengan kategori Transformer berisi beberapa koleksi & aset contoh. Sertakan skenario hub kosong (`category: null`).

## 6. Definition of Done

- [ ] `/transformer` menampilkan hero, koleksi unggulan, dan aset teratas kategori; aman saat kosong.
- [ ] `/collections` & detail menampilkan item ter-resolusi dengan kartu aset.
- [ ] Staf dapat membuat/menyunting koleksi & mengatur item; non-staf hanya membaca.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
