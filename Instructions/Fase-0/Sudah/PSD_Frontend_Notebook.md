# PSD — Instruksi Cursor: Notebook (Katalog + Buka di Colab)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Lingkup Fase 0: katalog notebook + tombol "Buka di Colab" + buat/kelola entri. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 22.

## 1. Skema & API

`NotebookDetailSchema = z.object({ id, title, description, tags: z.array(z.string()), owner: OwnerRefSchema, source_url: z.string().nullable(), colab_url: z.string().nullable() })`.

```ts
// lib/api/notebooks.ts (atau learn.ts)
export const getNotebooks = (q: { q?: string; page?: number } = {}) =>
  apiFetch(`/notebooks?${new URLSearchParams(q as Record<string, string>)}`, PaginatedNotebook);
export const getNotebook = (id: string) => apiFetch(`/notebooks/${id}`, NotebookDetailSchema);
export const createNotebook = (b: { title: string; description: string; tags: string[]; source_url: string }) =>
  apiFetch(`/notebooks`, NotebookDetailSchema, { method: "POST", body: JSON.stringify(b) });
export const updateNotebook = (id: string, b: any) =>
  apiFetch(`/notebooks/${id}`, NotebookDetailSchema, { method: "PATCH", body: JSON.stringify(b) });
export const deleteNotebook = (id: string) => apiFetch(`/notebooks/${id}`, z.any(), { method: "DELETE" });
```

> **Hapus** pemanggilan `launch` lama bila ada.

## 2. Katalog — `/notebooks`

Daftar kartu (judul, tag, pemilik + badge resmi bila `owner.is_official`) dari `getNotebooks`. Pencarian `q`. Tombol **"Bagikan notebook"** (login) → form buat.

## 3. Detail — `/notebooks/[id]`

- Tampilkan judul, deskripsi, tag, pemilik.
- **Tombol "Buka di Colab"**: bila `colab_url` ada → buka di tab baru (`target="_blank" rel="noopener"`). Bila `null` → tampilkan tombol nonaktif + petunjuk: "Buka di Colab tersedia untuk notebook bersumber GitHub. Lihat sumber di bawah."
- **"Lihat sumber"**: tautan ke `source_url` bila ada.
- Bila pemilik/admin: tombol **Edit** & **Hapus** (konfirmasi).

## 4. Buat / Edit notebook

Form: judul, deskripsi, tag (chip), dan **URL sumber `.ipynb`**. Validasi: URL valid; beri petunjuk format GitHub yang didukung Colab, mis. `https://github.com/{owner}/{repo}/blob/{branch}/path/notebook.ipynb`. Tampilkan pratinjau apakah "Buka di Colab" akan aktif (deteksi pola GitHub di sisi klien, opsional). Simpan → `createNotebook`/`updateNotebook` → arahkan ke detail.

## 5. Handler MSW

Tambah handler list/detail/create/patch/delete. Sertakan satu contoh dengan `colab_url` terisi (sumber GitHub) dan satu dengan `colab_url: null` (sumber non-GitHub) untuk menguji kedua keadaan tombol.

## 6. Definition of Done

- [ ] Katalog & detail notebook tampil; pencarian bekerja; badge resmi muncul.
- [ ] "Buka di Colab" membuka Colab untuk sumber GitHub; nonaktif + petunjuk untuk sumber lain.
- [ ] Pengguna login dapat membuat notebook; pemilik/admin dapat edit & hapus.
- [ ] Tidak ada lagi referensi ke endpoint `launch` lama.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
