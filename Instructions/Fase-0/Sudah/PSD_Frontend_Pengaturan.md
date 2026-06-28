# PSD — Instruksi Cursor: Pengaturan Menyeluruh

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun pusat pengaturan (`/settings`) dengan tab Notifikasi, Privasi, dan Tampilan. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 23.

## 1. Skema & API

```ts
export const SettingsSchema = z.object({
  notifications: z.object({ email_event_reminder: z.boolean(), email_competition: z.boolean(),
    email_forum_reply: z.boolean(), inapp: z.boolean() }),
  privacy: z.object({ profile_visibility: z.enum(["public","private"]),
    show_email: z.boolean(), searchable: z.boolean() }),
  appearance: z.object({ theme: z.enum(["system","light","dark"]),
    language: z.enum(["id","en"]), reduced_motion: z.boolean() }),
});

// lib/api/settings.ts
export const getSettings = () => apiFetch(`/me/settings`, SettingsSchema);
export const updateSettings = (patch: any) => apiFetch(`/me/settings`, SettingsSchema, { method: "PATCH", body: JSON.stringify(patch) });
```

## 2. Tata letak `/settings`

Tab/halaman: **Akun** & **Keamanan** (sudah ada, Item 1), **Profil** (sudah ada), **Notifikasi**, **Privasi**, **Tampilan**. Setiap perubahan toggle → `updateSettings({ section: { key: value } })` (kirim hanya bagian yang berubah) → toast "Tersimpan".

## 3. Notifikasi

Switch untuk: pengingat event (`email_event_reminder`), kabar kompetisi (`email_competition`), balasan forum (`email_forum_reply`), notifikasi dalam aplikasi (`inapp`). Beri keterangan singkat tiap baris.

## 4. Privasi

- **Visibilitas profil** (`profile_visibility`): publik / privat. Beri catatan: profil privat tak bisa dilihat pengguna lain.
- **Tampilkan email** (`show_email`): default mati.
- **Dapat ditemukan** (`searchable`): bila mati, tidak muncul di pencarian publik.

## 5. Tampilan

- **Tema** (`theme`): sistem / terang / gelap. Terapkan **langsung** ke UI (mis. via `next-themes` atau context tema) saat diubah, lalu simpan.
- **Bahasa** (`language`): id / en (siapkan i18n; minimal simpan preferensi).
- **Kurangi animasi** (`reduced_motion`): saat aktif, nonaktifkan transisi/animasi non-esensial; juga hormati `prefers-reduced-motion` OS.

Terapkan tema & reduced_motion dari settings saat aplikasi dimuat (baca sekali setelah login).

## 6. Handler MSW

Tambah handler `/me/settings` (GET kembalikan default, PATCH gabungkan & kembalikan).

## 7. Definition of Done

- [ ] `/settings` punya tab Notifikasi/Privasi/Tampilan (selain Akun/Keamanan/Profil yang ada).
- [ ] Toggle menyimpan per-bagian via `PATCH /me/settings`; tidak menimpa bagian lain; ada umpan balik "Tersimpan".
- [ ] Tema terang/gelap/sistem berlaku langsung & dipertahankan; `reduced_motion` mengurangi animasi.
- [ ] Privasi: profil privat & non-searchable berefek (diuji dengan akun lain).
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
