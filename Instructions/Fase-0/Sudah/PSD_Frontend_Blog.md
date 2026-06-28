# PSD — Instruksi Cursor: Blog (Berita & Informasi)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun blog publik + editor staf. **Kerjakan setelah backend Langkah 28.**

## 1. Skema & API

```ts
export const BlogSummarySchema = z.object({ slug: z.string(), title: z.string(), summary: z.string(),
  cover_url: z.string().nullable(), tags: z.array(z.string()), author: OwnerRefSchema, published_at: z.string().nullable() });
export const BlogDetailSchema = BlogSummarySchema.extend({ body_md: z.string(), status: z.string() });

// lib/api/blog.ts
export const getBlog = (page = 1, tag?: string) =>
  apiFetch(`/blog?page=${page}${tag ? `&tag=${tag}` : ""}`, PaginatedBlog);
export const getArticle = (slug: string) => apiFetch(`/blog/${slug}`, BlogDetailSchema);
export const createArticle = (b: any) => apiFetch(`/blog`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const updateArticle = (slug: string, b: any) => apiFetch(`/blog/${slug}`, z.object({ slug: z.string() }), { method: "PATCH", body: JSON.stringify(b) });
export const deleteArticle = (slug: string) => apiFetch(`/blog/${slug}`, z.any(), { method: "DELETE" });
export const uploadBlogImage = (file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/blog/images`, { method: "POST", body: fd, credentials: "include" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); });
};
```

## 2. Blog publik

- `/blog`: daftar kartu artikel (cover, judul, ringkasan, penulis + badge resmi, tanggal). Filter tag. `QueryView` + `EmptyState`.
- `/blog/[slug]`: artikel lengkap — cover, judul, meta penulis/tanggal, `body_md` dirender markdown, tag. Bagian "Artikel lain" di bawah (opsional).
- **Beranda**: bagian "Berita" menampilkan beberapa artikel terbaru dari `getBlog()`.
- **Footer**: tautan ke `/blog`.

## 3. Editor staf — `/admin/blog` (moderator/superadmin)

- Daftar artikel (termasuk draft, badge status) + tombol **Tulis artikel**.
- Editor: judul, slug (pratinjau), ringkasan, cover (unggah via `uploadBlogImage`), tag, dan **body markdown** (editor + pratinjau; sisipkan gambar via `uploadBlogImage`).
- Aksi: **Simpan draft** / **Terbitkan** (PATCH `status: "published"`) / **Hapus** (konfirmasi).
- Tambahkan "Blog" ke nav admin (untuk staf).

## 4. Handler MSW

Tambah handler `/blog`, `/blog/{slug}` (published & draft), create/patch/delete, dan `/blog/images`.

## 5. Definition of Done

- [ ] `/blog` & `/blog/[slug]` tampil; markdown & cover terender; filter tag bekerja.
- [ ] Bagian "Berita" di beranda + tautan footer.
- [ ] Staf dapat menulis, mengunggah gambar, menyimpan draft, menerbitkan, & menghapus.
- [ ] Draft tak terlihat publik; non-staf tak melihat editor.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
