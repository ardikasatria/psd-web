# PSD — Instruksi Cursor: Aset — README, File, Edit & Buat

> **Cara pakai:** Lampirkan bersama dokumen frontend. Mematangkan halaman aset: render README, kelola file, edit metadata, dan alur buat yang mulus. **Kerjakan setelah Item 1.** Prasyarat: backend Langkah 15.

## 1. Skema & API

`FileEntrySchema` → tambah `url: z.string()`. `RepoDetailSchema.files` pakai itu.

```ts
// lib/api/repos.ts
export const uploadRepoFile = (repoId: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/repos/${repoId}/files`, { method: "POST", body: fd, credentials: "include" })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); });
};
export const deleteRepoFile = (repoId: string, path: string) =>
  apiFetch(`/repos/${repoId}/files?path=${encodeURIComponent(path)}`, z.any(), { method: "DELETE" });
export const updateRepo = (repoId: string, body: Partial<{ description: string; tags: string[]; license: string; visibility: string; readme_md: string }>) =>
  apiFetch(`/repos/${repoId}`, RepoDetailSchema, { method: "PATCH", body: JSON.stringify(body) });
// createRepo sudah ada (Langkah 5) → tambahkan readme_md & license ke body
```

> Unggah file pakai `FormData` + `credentials:"include"` (cookie auth), bukan `apiFetch`.

## 2. Halaman detail aset — `/[kind]/[owner]/[name]`

Tab pada halaman:

- **README:** render `repo.readme_md` dengan komponen markdown (sama dengan yang dipakai di tempat lain). Bila kosong & pemilik → ajakan "Tambahkan README".
- **File:** daftar `repo.files` (nama, ukuran ter-format, tombol Unduh → `file.url`).
  - Bila **pemilik** (`me.username === repo.owner.username`): area unggah (drag/pilih) → `uploadRepoFile` lalu `invalidateQueries` detail; tiap file punya tombol Hapus → `deleteRepoFile` (konfirmasi).
- **Diskusi:** sudah ada (Langkah 11).
- Tombol **Like** sudah ada (Langkah 11); tombol **Edit** (pemilik) → buka form edit.

Ukuran file diformat ramah (KB/MB).

## 3. Edit aset (pemilik)

Form (modal/halaman): deskripsi, tags (input chip), lisensi (select umum: MIT, Apache-2.0, CC-BY-4.0, dll.), visibility (public/private), README (editor markdown + pratinjau). Simpan → `updateRepo` → `invalidateQueries`.

## 4. Alur "Buat aset" — `/[kind]/new` atau modal

Form mulus: nama, jenis (project/dataset/model — atau tetap pada konteks rute), deskripsi, tags, lisensi, visibility, README awal (opsional), dan unggah file awal (opsional, setelah aset dibuat). Setelah `createRepo` sukses, arahkan ke halaman detail aset baru, lalu pengguna bisa mengunggah file.

Validasi: nama wajib & ramah-slug (tanpa spasi/karakter aneh); tampilkan pratinjau slug `username/nama`.

## 5. Handler MSW

Tambah handler unggah/hapus file & PATCH repo (kembalikan entry/detail sesuai kontrak) agar mode mock tetap jalan.

## 6. Definition of Done

- [ ] README dirender; pemilik bisa menyuntingnya.
- [ ] Tab File: daftar + unduh; pemilik bisa unggah & hapus (dengan konfirmasi).
- [ ] Edit metadata (deskripsi/tags/lisensi/visibility) berfungsi untuk pemilik; non-pemilik tak melihat kontrol edit.
- [ ] Alur buat aset mulus dengan pratinjau slug; setelah buat, bisa langsung unggah file.
- [ ] Ukuran file ter-format; state loading/kosong/error di tiap tab.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
