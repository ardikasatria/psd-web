# PSD — Instruksi Cursor: Manajemen Kategori Universal (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Penjelajahan kategori, pemilih kategori (dipakai di semua form aset), filter, dan kelola admin. **Kerjakan setelah backend Langkah 33.**

## 1. Skema & API

```ts
export const CategorySchema = z.object({ slug: z.string(), name: z.string(),
  description: z.string().optional(), subcategory_count: z.number().optional() });
export const SubcategorySchema = z.object({ slug: z.string(), name: z.string() });

// lib/api/categories.ts
export const getCategories = () => apiFetch(`/categories`, z.array(CategorySchema));
export const getCategory = (slug: string) =>
  apiFetch(`/categories/${slug}`, CategorySchema.extend({ subcategories: z.array(SubcategorySchema) }));
export const addSubcategory = (slug: string, name: string) =>
  apiFetch(`/categories/${slug}/subcategories`, SubcategorySchema.extend({ parent: z.string() }), { method: "POST", body: JSON.stringify({ name }) });
// admin
export const createCategory = (b: { name: string; description?: string }) => apiFetch(`/admin/categories`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const updateCategory = (slug: string, b: any) => apiFetch(`/admin/categories/${slug}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const deleteCategory = (slug: string) => apiFetch(`/admin/categories/${slug}`, z.any(), { method: "DELETE" });
```

## 2. Pemilih Kategori — `components/common/CategoryPicker.tsx`

Dipakai di **semua** form buat/edit aset (Repo, Notebook, Course, Competition, Event):

- Dropdown **Kategori utama** (`getCategories`).
- Setelah memilih, dropdown **Subkategori** (`getCategory(slug).subcategories`).
- Opsi **"+ Tambah subkategori"**: input nama → `addSubcategory(category, name)`:
  - Sukses → pilih otomatis subkategori baru, refresh daftar.
  - **`409 subcategory_exists`** → tampilkan **peringatan** ("Subkategori sudah ada") dan **pilih yang sudah ada** alih-alih membuat duplikat.
- Kirim `category` & `subcategory` (slug) ke form aset.

## 3. Penjelajahan kategori

- `/categories`: grid kategori utama (nama, deskripsi, jumlah sub).
- `/categories/[slug]`: deskripsi + daftar subkategori; tab/daftar aset terfilter kategori ini (panggil daftar aset dengan `?category=slug`).
- Klik subkategori → filter `?category=slug&subcategory=subSlug`.

## 4. Filter di halaman daftar

Pada daftar aset (projects/datasets/models, notebooks, courses, competitions, events): tambah filter **Kategori → Subkategori** yang meneruskan `category`/`subcategory` ke API; cerminkan di URL agar bisa dibagikan. Tampilkan chip kategori pada kartu aset (tautan ke halaman kategori).

## 5. Admin: kelola kategori utama

Halaman `/admin/categories` (staf): tabel kategori utama (nama, jumlah sub) + Buat/Edit/Hapus (konfirmasi hapus karena menghapus subkategori). (Opsional) moderasi subkategori. Tambah "Kategori" ke nav admin.

## 6. Handler MSW

Tambah handler kategori (beberapa utama mis. "Transformer", "Computer Vision"; sub di tiap utama), add-subcategory (sukses + skenario `409`), dan endpoint admin.

## 7. Definition of Done

- [ ] `CategoryPicker` dipakai konsisten di semua form aset; subkategori bisa ditambah inline dengan peringatan duplikat.
- [ ] Penjelajahan `/categories` & detail menampilkan aset terfilter.
- [ ] Filter kategori/subkategori di daftar aset, tercermin di URL; chip kategori di kartu.
- [ ] Staf mengelola kategori utama.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
