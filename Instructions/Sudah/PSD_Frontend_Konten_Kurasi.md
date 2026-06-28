# PSD — Instruksi Cursor: Konten Awal & Kurasi (Badge Resmi, Featured, Pengumuman, Bantuan)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menambah badge resmi, bagian featured, banner pengumuman, manajemen pengumuman admin, dan halaman bantuan statis. **Kerjakan setelah Item 1–3 & onboarding.** Prasyarat: backend Langkah 18.

## 1. Skema & API

- `OwnerRefSchema` **+** `is_official: z.boolean().optional()`; `ProfileSchema` **+** `is_official: z.boolean().default(false)`; summary konten **+** `featured: z.boolean().optional()`.
- `AnnouncementSchema = z.object({ id, title, body_md, level: z.enum(["info","penting"]) })`.

```ts
// lib/api/announcements.ts
export const getAnnouncements = () => apiFetch(`/announcements`, z.array(AnnouncementSchema));
// admin
export const createAnnouncement = (b: any) => apiFetch(`/admin/announcements`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const updateAnnouncement = (id: string, b: any) => apiFetch(`/admin/announcements/${id}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const deleteAnnouncement = (id: string) => apiFetch(`/admin/announcements/${id}`, z.any(), { method: "DELETE" });
// toggle featured (admin) — pakai endpoint admin yang ada
export const setFeatured = (kind: "competitions" | "events" | "repos", key: string, featured: boolean) =>
  apiFetch(`/admin/${kind}/${key}`, z.any(), { method: "PATCH", body: JSON.stringify({ featured }) });
```

## 2. Badge "Resmi"

Komponen kecil `components/common/OfficialBadge.tsx` (ikon/centang tema). Tampilkan di samping nama owner pada **kartu aset, halaman profil, dan kartu kompetisi/event** bila `owner.is_official` / `profile.is_official` true. Beri `title="Akun resmi PSD"`.

## 3. Bagian Featured

Di beranda/explore, gunakan `getDiscover()` (Item 3) yang kini berbasis flag — tampilkan **"Pilihan PSD"** (featured) menonjol di atas "Terbaru". Beri badge kecil "Pilihan" pada kartu featured.

## 4. Banner Pengumuman

`components/common/AnnouncementBanner.tsx`:
- Ambil `getAnnouncements()`; tampilkan pengumuman teratas yang aktif di **beranda & dashboard** (di atas konten).
- Gaya menurut `level` (`info` netral, `penting` lebih menonjol — pakai komponen alert tema).
- **Dapat ditutup**; simpan id yang ditutup di `sessionStorage` agar tidak muncul lagi selama sesi. Render `body_md` sebagai teks/markdown ringkas.

## 5. Admin: Manajemen Pengumuman & Toggle Featured

- Halaman baru `/admin/announcements`: tabel pengumuman (judul, level, aktif) + **Buat**, **Edit** (form: title, body_md, level, active), **Hapus** (konfirmasi). Pola sama dengan manajemen kompetisi (admin panel).
- Tambahkan **toggle "Featured"** (switch) di baris tabel admin untuk Aset, Kompetisi, dan Event → `setFeatured(...)` lalu `invalidateQueries`.
- Tambah item "Pengumuman" ke nav admin.

## 6. Halaman Bantuan Statis (Fase 0)

Buat rute statis (markdown di repo, dirender dengan komponen markdown yang ada). CMS penuh menyusul di Fase 1.

| Rute | Isi |
|---|---|
| `/help` | Indeks bantuan (tautan ke bawah) |
| `/help/apa-itu-psd` | Penjelasan singkat PSD & nilainya |
| `/help/panduan-memulai` | Langkah pertama bagi pendatang baru |
| `/help/faq` | Pertanyaan umum |
| `/help/pedoman-komunitas` | Aturan & etika komunitas |

Tautkan halaman ini di **footer** dan dari **alur sambutan/checklist onboarding**. Tulis copy awal berbahasa Indonesia, kalimat aktif; boleh sederhana, yang penting ada.

## 7. Handler MSW

Tambah handler `/announcements` (1–2 pengumuman demo), endpoint admin pengumuman, dan pastikan `/discover` mock menyertakan item featured. Badge resmi: set `is_official: true` pada owner "psd" di data mock.

## 8. Definition of Done

- [ ] Badge "Resmi" tampil untuk akun `psd` di kartu & profil.
- [ ] Bagian "Pilihan PSD" (featured) muncul di beranda/explore dari `/discover`.
- [ ] Banner pengumuman tampil di beranda/dashboard, sesuai `level`, dan dapat ditutup (persist per sesi).
- [ ] Admin: kelola pengumuman (CRUD) dan toggle featured pada aset/kompetisi/event.
- [ ] Halaman bantuan `/help/*` ada dan tertaut dari footer & onboarding.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
