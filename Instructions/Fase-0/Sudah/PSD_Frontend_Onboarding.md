# PSD — Instruksi Cursor: Onboarding Pengguna

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun alur sambutan, checklist "Mulai di sini", pemilihan minat, dan audit empty state. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 17.

## 1. Skema & API

- `ProfileSchema` (types/api.ts): tambah `interests: z.array(z.string()).default([])`, `onboarded: z.boolean().default(false)`.
- `OnboardingSchema = z.object({ onboarded: z.boolean(), interests: z.array(z.string()), checklist: z.object({ profile_completed: z.boolean(), email_verified: z.boolean(), interests_selected: z.boolean(), has_asset: z.boolean(), joined_competition: z.boolean(), joined_discussion: z.boolean() }) })`.

```ts
// lib/api/me.ts
export const getOnboarding = () => apiFetch(`/me/onboarding`, OnboardingSchema);
export const completeOnboarding = () => apiFetch(`/me/onboarding/complete`, z.any(), { method: "POST" });
// updateProfile sudah ada → kirim { interests } untuk menyimpan minat
```

## 2. Daftar minat (konstanta bersama) — `lib/constants/interests.ts`

```ts
export const INTERESTS = [
  { id: "nlp", label: "NLP / Bahasa" },
  { id: "cv", label: "Computer Vision" },
  { id: "tabular", label: "ML Tabular" },
  { id: "forecasting", label: "Forecasting" },
  { id: "mlops", label: "MLOps" },
  { id: "sdgs", label: "SDGs" },
  { id: "umkm", label: "UMKM" },
  { id: "kebencanaan", label: "Kebencanaan" },
  { id: "kesehatan", label: "Kesehatan" },
  { id: "pertanian", label: "Pertanian" },
  { id: "data-publik", label: "Data Publik" },
  { id: "bahasa-daerah", label: "Bahasa Daerah" },
];
```

## 3. Alur Sambutan (welcome flow)

Tampilkan **sekali**, saat pengguna login dan `user.onboarded === false` (dari `useAuth()`/`/auth/me`). Modal/halaman bertahap (komponen tema), singkat:

1. **Selamat datang** — sapaan + 1 kalimat nilai PSD.
2. **Lengkapi profil** — unggah avatar + isi bio singkat (pakai komponen dari halaman personalisasi). Boleh "Lewati".
3. **Pilih minat** — multi-select chip dari `INTERESTS` → simpan via `updateProfile({ interests })`.
4. **Mulai dari sini** — tampilkan 2–3 aksi pertama (buat proyek, jelajahi dataset, ikuti kompetisi).

Tombol "Selesai"/"Lewati" → `completeOnboarding()` + `invalidateQueries(["me"])`, lalu tutup. Setelah ini tidak muncul lagi.

Hormati `prefers-reduced-motion`; jangan memblokir — selalu bisa dilewati.

## 4. Checklist "Mulai di sini" (dashboard)

Widget di atas dashboard memakai `getOnboarding()`. Tampilkan item checklist dengan status centang + tautan aksi:

| Item | Selesai bila | Aksi/tautan |
|---|---|---|
| Lengkapi profil | `profile_completed` | `/settings/profile` |
| Verifikasi email | `email_verified` | tombol "Kirim ulang" |
| Pilih minat | `interests_selected` | `/settings/profile` |
| Buat aset pertama | `has_asset` | `/projects/new` |
| Ikuti kompetisi | `joined_competition` | `/competitions` |
| Gabung diskusi | `joined_discussion` | `/community` |

- Tampilkan progres (mis. "3/6"). **Sembunyikan** widget bila semua item selesai **atau** `onboarded === true` dan progres penuh.
- Beri tombol "Sembunyikan" → `completeOnboarding()`.

## 5. Minat di pengaturan

Tambah bagian "Minat" di `/settings/profile` (chip multi-select dari `INTERESTS`) → `updateProfile({ interests })`. Pakai ringan untuk personalisasi: bila ada minat, urutkan/utamakan kartu di `/discover` yang tag-nya cocok (opsional, jangan menyembunyikan konten lain).

## 6. Audit Empty State (konsisten di semua fitur)

Buat satu komponen `components/common/EmptyState.tsx` (di atas komponen tema):

```tsx
export function EmptyState({ title, description, cta, href }:
  { title: string; description: string; cta?: string; href?: string }) {
  return (
    <ThemeEmpty>
      <h4>{title}</h4>
      <p>{description}</p>
      {cta && href && <ThemeButton href={href}>{cta}</ThemeButton>}
    </ThemeEmpty>
  );
}
```

Aturan: **setiap** daftar/section yang bisa kosong memakai `EmptyState` dengan **ajakan bertindak**, bukan "tidak ada data". Terapkan/seragamkan di: daftar aset, portofolio, kompetisi, event, course, forum, diskusi aset, submission saya, event saya, hasil pencarian, dan tab profil.

Contoh copy (kalimat aktif): "Belum ada proyek. Buat yang pertama dan mulai berkarya." → CTA "Buat proyek".

## 7. Handler MSW

Tambah handler `/me/onboarding` (checklist demo) & `/me/onboarding/complete`. Sediakan dua variasi data agar bisa menguji tampilan "baru" (banyak `false`) dan "hampir selesai".

## 8. Definition of Done

- [ ] Alur sambutan muncul sekali untuk pengguna baru (`onboarded=false`), bisa dilewati, dan tak muncul lagi setelah selesai.
- [ ] Minat tersimpan via `updateProfile` dan dapat diubah di pengaturan.
- [ ] Checklist "Mulai di sini" mencerminkan aktivitas nyata; tiap item bertaut ke aksinya; menampilkan progres.
- [ ] Widget checklist hilang saat selesai/di-sembunyikan.
- [ ] Komponen `EmptyState` dipakai konsisten di seluruh daftar/section dengan ajakan bertindak.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
