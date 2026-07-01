# PSD — Instruksi Cursor: Pencarian Universal di Header (Semua Fitur)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menyempurnakan **kotak pencarian header** dari
> "aset saja" → **universal**: akun/username, postingan (feed), organisasi, proyek/model/dataset/notebook,
> kompetisi, event, tim, forum. Dropdown cepat terkelompok + halaman hasil bertab. Prasyarat: backend Langkah 34.

## 1. Skema & API

```ts
export const SearchHitSchema = z.object({
  kind: z.enum(["user","post","org","project","model","dataset","notebook","competition","event","team","forum"]),
  id: z.string(), title: z.string(), subtitle: z.string().nullable().optional(),
  url: z.string(), score: z.number().optional(),
});
export const SearchResponseSchema = z.object({
  query: z.object({ text: z.string(), filters: z.record(z.any()) }),
  total: z.number(),
  results: z.array(SearchHitSchema),
  grouped: z.record(z.array(SearchHitSchema)),   // { kind: [hits] }
});

// lib/api/search.ts
export const universalSearch = (q: string, opts?: { type?: string; limit?: number; per_category?: number; page?: number }) =>
  apiFetch(`/search?q=${encodeURIComponent(q)}${opts?.type ? `&type=${opts.type}` : ""}` +
           `${opts?.limit ? `&limit=${opts.limit}` : ""}${opts?.per_category ? `&per_category=${opts.per_category}` : ""}` +
           `${opts?.page ? `&page=${opts.page}` : ""}`, SearchResponseSchema);
```

## 2. Kotak pencarian header (dropdown cepat)

- Input di header dengan **debounce ~200ms**; panggil `universalSearch(q, { per_category: 4, limit: 20 })`.
- Tampilkan **dropdown terkelompok** dari `grouped`, satu seksi per kategori (urutan saran: Akun,
  Organisasi, Kompetisi, Proyek, Model, Dataset, Notebook, Event, Tim, Forum, Postingan). Tiap seksi
  maksimal beberapa item; header seksi menampilkan label kategori.
- Tiap item: ikon per `kind`, `title`, `subtitle` (mis. "Organisasi", "Feed", nama lengkap untuk akun),
  navigasi ke `url` saat diklik.
- Baris terakhir: **"Lihat semua hasil untuk '{q}'"** → buka `/search?q=...`.
- **Keyboard**: ↑/↓ pindah item, Enter buka, Esc tutup. Fokus otomatis; klik luar menutup.
- Label kategori & ikon:
  `user`→Akun, `org`→Organisasi, `post`→Postingan, `project/model/dataset/notebook`→Aset,
  `competition`→Kompetisi, `event`→Event, `team`→Tim, `forum`→Forum.

## 3. Operator pencarian (dukung di input)

Teruskan apa adanya ke backend (backend yang parsing); tampilkan hint kecil:
- `type:organisasi` / `type:kompetisi` / `type:akun` … — batasi ke satu tipe.
- `@username` — cari akun.
- `#tag` — filter tag.
- `owner:nama` — filter pemilik.

## 4. Halaman hasil `/search`

- Baca `q` dan opsional `type` dari URL.
- **Tab tipe**: Semua / Akun / Organisasi / Postingan / Proyek / Model / Dataset / Notebook / Kompetisi /
  Event / Tim / Forum. Tab "Semua" pakai `results`; tab lain memanggil `universalSearch(q, { type })` + paginasi.
- Tiap hasil = kartu sesuai tipe (avatar untuk akun/org, cuplikan untuk postingan/forum, meta untuk aset/kompetisi).
- Tampilkan `total` & keadaan kosong ("Tidak ada hasil untuk '{q}'"). Tautan tiap kartu ke `url`.

## 5. Perilaku & aksesibilitas

- Query kosong + tab tipe → **mode jelajah** (backend urut popularitas) untuk menelusuri kategori.
- Jangan menampilkan aset/akun privat (backend sudah menyaring visibilitas).
- `role="combobox"`/`aria-activedescendant` untuk dropdown; umumkan jumlah hasil ke pembaca layar.

## 6. Handler MSW

Tambah handler `/search`: campuran lintas tipe (user/org/post/aset/kompetisi/…), `grouped` untuk dropdown,
filter `type=` (termasuk alias `organisasi`), `@username`, dan mode jelajah (q kosong).

## 7. Definition of Done

- [ ] Kotak header mencari **semua entitas** (akun, postingan, organisasi, aset, kompetisi, event, tim, forum).
- [ ] Dropdown cepat terkelompok + navigasi keyboard + "Lihat semua".
- [ ] Halaman `/search` bertab per tipe dengan paginasi; "Semua" menggabungkan.
- [ ] Operator `type:`/`@`/`#`/`owner:` bekerja (alias ID dikenali).
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
