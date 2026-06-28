# PSD — Instruksi Cursor: Pencarian Global, Halaman Tag & Penemuan

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menambah pencarian global, filter/sortir, halaman tag, dan bagian unggulan/terbaru. **Kerjakan setelah Item 1 & 2.** Prasyarat: backend Langkah 16.

## 1. API & skema

```ts
// lib/api/search.ts
export const search = (q: string, type?: "repos" | "competitions") =>
  apiFetch(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`, SearchResultSchema);

// lib/api/repos.ts
export const getDiscover = () => apiFetch(`/discover`, DiscoverSchema);
// listRepos(kind, { q, tags, sort, page }) → sudah ada; pastikan teruskan tags & sort ke query string
```

`SearchResultSchema = z.object({ repos: z.array(z.any()), competitions: z.array(z.any()) })` (longgar; perketat bila perlu). `DiscoverSchema = z.object({ featured: z.array(RepoSummarySchema), recent: z.array(RepoSummarySchema) })`.

## 2. Bilah pencarian global (header)

- Input pencarian di header (komponen tema). Mengetik + Enter → arahkan ke `/search?q=...`.
- Opsional: dropdown hasil cepat (debounce ~300ms) memanggil `search(q)` dan menampilkan beberapa hit teratas dengan tautan; "Lihat semua hasil" → `/search`.

## 3. Halaman hasil — `/search`

- Ambil `q` dari query string; panggil `search(q, type)`.
- Tampilkan hasil **berkelompok**: Aset & Kompetisi (pakai kartu yang sudah ada).
- Filter: tombol tipe (Semua / Aset / Kompetisi). State loading/kosong ("Tidak ada hasil untuk '…'")/error.

## 4. Filter & sortir pada halaman daftar aset

Pada `/projects` `/datasets` `/models`:
- Kontrol **sortir** (Terbaru `-updated_at`, Terpopuler `-downloads`, Paling disukai `-likes`) → teruskan ke `listRepos`.
- Kontrol **filter tag** (chip) → teruskan `tags` (gabung koma).
- URL mencerminkan state (query param) agar bisa dibagikan.

## 5. Halaman tag — `/tags/[tag]`

Daftar aset dengan tag tersebut (panggil `listRepos(kind?, { tags })` lintas jenis atau default datasets/models/projects digabung). Judul "Tag: {tag}". Tautkan chip tag di kartu & detail aset ke halaman ini.

## 6. Penemuan di beranda/explore

Tambah bagian dari `getDiscover()`:
- **Unggulan** (featured) — baris kartu.
- **Terbaru** (recent) — baris kartu.
Plus (sudah ada) Kompetisi aktif & Event mendatang. Beri tautan "Lihat semua".

## 7. Handler MSW

Tambah handler `/search` & `/discover` dengan data demo (pakai aset/kompetisi seed) agar mode mock berfungsi.

## 8. Definition of Done

- [ ] Bilah pencarian global mengarah ke `/search`; hasil dikelompokkan & dapat difilter per tipe.
- [ ] Daftar aset mendukung sortir & filter tag, tercermin di URL.
- [ ] Halaman `/tags/[tag]` menampilkan aset terkait; chip tag dapat diklik.
- [ ] Beranda/explore menampilkan Unggulan & Terbaru dari `/discover`.
- [ ] State loading/kosong/error di semua tampilan; mode mock berfungsi.
- [ ] Flip ke backend nyata tanpa ubah komponen.
