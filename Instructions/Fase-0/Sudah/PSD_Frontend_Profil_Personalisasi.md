# PSD — Instruksi Cursor: Halaman Profil & Personalisasi (Fase 0)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Membangun halaman profil publik (`/u/[username]`) dan halaman personalisasi (`/settings/profile`). **Kerjakan hanya langkah ini.** Prasyarat: backend Langkah 13 + kontrak diperbarui.
>
> **Arah rasa:** terinspirasi Discord (banner, accent color, custom status/mood, about me, links) — **playful, hidup, tetap elegan**. Tema yang Anda beli menentukan tampilan; accent color milik pengguna jadi pengikat personalisasi.

## 1. Guardrails

- **Tema = sumber kebenaran visual.** Komponen dari tema. Jangan bikin sistem desain baru.
- **Accent color milik pengguna** dipakai sebagai aksen halaman lewat CSS var (lihat §4). Jangan mengubah keseluruhan palet tema — hanya aksen (garis, highlight, tombol sekunder, ring avatar).
- Semua data via `lib/api/*` + TanStack Query/Mutation. Unggah file pakai `FormData`.
- Hormati `prefers-reduced-motion`. Sediakan fallback elegan saat banner/avatar kosong (gradien dari accent color).
- Copy Indonesia, kalimat aktif.

## 2. Skema Zod — `types/api.ts`

```ts
export const LinkItemSchema = z.object({ label: z.string(), url: z.string() });
export const ProfileSchema = z.object({
  id: z.string(), username: z.string(), name: z.string(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable(), banner_url: z.string().nullable(),
  accent_color: z.string().nullable(), pronouns: z.string().nullable(),
  location: z.string().nullable(), bio: z.string().nullable(),
  about_md: z.string().nullable(),
  status_emoji: z.string().nullable(), status_text: z.string().nullable(),
  links: z.array(LinkItemSchema).default([]),
  role: z.string(), created_at: z.string(),
  stats: z.object({ repos: z.number() }).optional(),
});
```

## 3. API — `lib/api/me.ts` & `lib/api/users.ts`

```ts
// users.ts
export const getProfile = (username: string) =>
  apiFetch(`/users/${username}`, ProfileSchema);

// me.ts
export const getMyProfile = () => apiFetch(`/auth/me`, ProfileSchema);
export const updateProfile = (body: Partial<...>) =>
  apiFetch(`/me`, ProfileSchema, { method: "PATCH", body: JSON.stringify(body) });

async function uploadImage(path: string, file: File) {
  const fd = new FormData(); fd.append("file", file);
  const token = localStorage.getItem("psd_token");
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: "POST", body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("upload gagal");
  return res.json();
}
export const uploadAvatar = (f: File) => uploadImage("/me/avatar", f);
export const uploadBanner = (f: File) => uploadImage("/me/banner", f);
```

> Catatan: unggah file **tidak** memakai `apiFetch` (yang men-set `Content-Type: application/json`). Pakai `FormData` mentah seperti di atas agar boundary multipart benar.

## 4. Accent color sebagai pengikat

Bungkus halaman profil & kartu pratinjau dengan style var:

```tsx
<div className="profile" style={{ ["--psd-accent" as any]: profile.accent_color ?? "var(--theme-accent)" }}>
  {/* gunakan var(--psd-accent) untuk ring avatar, garis bawah tab, tombol ikuti, dsb. */}
</div>
```

Banner kosong → latar gradien dari `--psd-accent`. Ini sumber "playful tapi elegan".

## 5. Halaman Profil Publik — `app/(public)/u/[username]/page.tsx`

Struktur (tema yang menata gaya):

```
┌───────────────────────────────────────────┐
│  BANNER (atau gradien accent)               │
│        ◯ avatar (ring accent)               │
├───────────────────────────────────────────┤
│  Nama · @username · pronouns                 │
│  [😄 status_text]  📍 location                │
│  bio (satu baris)                            │
│  [link1] [link2] ...                         │
├───────────────────────────────────────────┤
│  Tentang (about_md, dirender markdown)       │
├───────────────────────────────────────────┤
│  Tab: Portofolio | Diskusi                   │
│   → Portofolio: GET /users/{u}/portfolio     │
└───────────────────────────────────────────┘
```

- Data via `getProfile(username)`; state loading/kosong/error.
- `about_md` dirender dengan komponen markdown yang sudah dipakai untuk README aset (konsisten).
- Status ditampilkan sebagai pill (emoji + teks) bila ada.
- Bila profil milik pengguna sendiri, tampilkan tombol **"Edit profil"** → `/settings/profile`.
- Tab Portofolio memuat aset (komponen kartu yang sudah ada).

## 6. Halaman Personalisasi — `app/(app)/settings/profile/page.tsx`

Dua panel: **editor (kiri)** + **pratinjau langsung (kanan)** memakai komponen kartu profil yang sama, agar pengguna melihat perubahan seketika ("seperti dirinya, mengikuti mood").

Editor (pakai field/komponen tema):
- **Avatar & banner:** unggah dengan pratinjau. Saat dipilih, tampilkan pratinjau lokal (`URL.createObjectURL`) lalu panggil `uploadAvatar/uploadBanner`; perbarui state dari URL hasil.
- **Identitas:** nama, pronouns, location.
- **Custom status:** pemilih emoji + input teks (mood saat ini).
- **Accent color:** color picker (simpan hex). Pratinjau langsung berubah.
- **Bio:** satu baris singkat.
- **Tentang (about_md):** editor markdown (textarea + pratinjau).
- **Links:** daftar dapat tambah/hapus baris (`{label, url}`).
- Tombol **Simpan** → `updateProfile(body)`; sukses → `invalidateQueries(["me"])` + toast "Profil tersimpan".

Validasi ringan: URL link valid; accent color format hex; ukuran file (avatar ≤2MB, banner ≤4MB) sebelum unggah, dengan pesan jelas.

## 7. Sentuhan playful-elegan (dalam batas tema)

- Transisi halus saat accent berubah & saat hover kartu (nonaktif bila `prefers-reduced-motion`).
- Ring avatar & garis tab memakai `--psd-accent`.
- Empty state ramah: tanpa banner → gradien accent; tanpa about → ajakan "Ceritakan tentang dirimu".
- Hindari berlebihan: aksen secukupnya, ruang putih cukup, tipografi tema tetap dominan.

## 8. Definition of Done

- [ ] `/u/[username]` menampilkan profil kaya (banner, avatar, status, pronouns, location, about, links, portofolio) dengan aksen warna pengguna.
- [ ] `/settings/profile` (ber-auth) mengedit semua field dengan **pratinjau langsung**; simpan via `PATCH /me`.
- [ ] Unggah avatar & banner berfungsi (FormData), dengan pratinjau & validasi ukuran/format.
- [ ] Accent color mengubah aksen halaman, bukan seluruh palet tema.
- [ ] Fallback elegan saat banner/avatar/about kosong; `prefers-reduced-motion` dihormati.
- [ ] Mode mock (MSW) berfungsi; flip ke backend nyata tanpa ubah komponen.
