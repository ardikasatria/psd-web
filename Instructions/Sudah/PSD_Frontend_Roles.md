# PSD — Instruksi Cursor: Penyempurnaan Roles (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menyesuaikan UI dengan model role baru (member/moderator/superadmin) & jenis akun (individu/organisasi). **Kerjakan setelah backend Langkah 27.**

## 1. Skema

`ProfileSchema`/`OwnerRefSchema`: `role` ∈ `z.enum(["member","moderator","superadmin"])`, `account_type` ∈ `z.enum(["individual","organization"])`. `OwnerRef.type` tetap `user|org` (dari backend).

## 2. Gerbang akses (helper)

```ts
export const isStaff = (u?: { role?: string }) => u?.role === "moderator" || u?.role === "superadmin";
export const isSuperadmin = (u?: { role?: string }) => u?.role === "superadmin";
```

- **Panel admin** (`/admin/*`): buka untuk **staf** (`isStaff`). Guard (`useAdminGuard`) ganti cek `role==="admin"` → `isStaff(me)`.
- **Menu navigasi admin** disaring per peran:
  - Moderator (humas): Ringkasan, **Blog**, Pengumuman, Featured, Pengajuan Instruktur, Moderasi (forum/postingan), Event/Course.
  - Superadmin: semua di atas **+ Pengguna & Role**.
- Sembunyikan menu "Pengguna" dari moderator; bila diakses langsung → `/403`.

## 3. Manajemen role (superadmin)

Di `/admin/users` (hanya superadmin): selain aktif/nonaktif & hapus, tambah **pemilih role** per baris (`member`/`moderator`/`superadmin`) → `PATCH /admin/users/{id}` dengan `{ role }`. Beri konfirmasi saat menaikkan ke `superadmin`.

## 4. Tampilan jenis akun

- Profil organisasi (`account_type==="organization"`): tampilkan label "Organisasi" + (bila `is_official`) badge Resmi. Pertimbangkan tata letak halaman org yang sedikit berbeda (mis. fokus aset & anggota — anggota = Fase 2).
- Badge peran staf (opsional, halus): tampilkan "Humas"/"Super Admin" hanya di konteks internal/panel, bukan di profil publik.

## 5. Definition of Done

- [ ] Panel admin terbuka untuk moderator & superadmin; menu disaring per peran.
- [ ] Hanya superadmin melihat & mengelola Pengguna/Role; moderator diarahkan `/403` bila memaksa.
- [ ] Superadmin dapat mengubah role pengguna (dengan konfirmasi untuk superadmin).
- [ ] Organisasi ditandai jelas (label + badge resmi); `OwnerRef.type` benar di kartu.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
