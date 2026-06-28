# PSD — Instruksi Cursor: Akun & Keamanan (Migrasi Cookie + Halaman Keamanan)

> **Cara pakai:** Lampirkan bersama dokumen frontend. **Kerjakan sebelum Item 2 & 3.** Memindahkan auth ke cookie `httpOnly` dan menambah halaman keamanan. Prasyarat: backend Langkah 14.

## 1. Perubahan inti: auth lewat cookie

Karena token kini cookie `httpOnly`, frontend **tidak bisa & tidak perlu** membaca token. Konsekuensi:

### 1.1 `lib/api/client.ts`
- Tambah `credentials: "include"` di setiap `fetch`.
- **Hapus** pembacaan `localStorage` & header `Authorization`.

```ts
const res = await fetch(`${BASE}${PREFIX}${path}`, {
  ...init,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...init.headers },
});
```

### 1.2 Status login dari `/auth/me`, bukan localStorage
Buat `lib/auth/useAuth.ts`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/api/me";

export function useAuth() {
  const me = useQuery({ queryKey: ["me"], queryFn: getMyProfile, retry: false });
  return { user: me.data, isLoggedIn: !!me.data, isLoading: me.isLoading };
}
```

### 1.3 Ganti SEMUA cek `localStorage.getItem("psd_token")`
Di `useAuthGuard`, `useAdminGuard`, `LikeButton`, tombol unggah, dll. — ganti dengan status dari `useAuth()`:
- Guard: bila `!isLoading && !isLoggedIn` → `router.replace("/login?next=...")`.
- Aksi butuh login (like, diskusi, unggah): bila `!isLoggedIn` → arahkan ke login.
- Unggah file (avatar/banner/aset): cukup `credentials: "include"` pada `fetch` FormData; **tanpa** header Authorization.

### 1.4 Logout
Tambah `logout()` di `lib/api/auth.ts` → `POST /auth/logout` (`credentials:"include"`), lalu `queryClient.clear()` dan arahkan ke `/`.

## 2. Halaman & alur baru

### 2.1 `/settings/security` (ber-auth)
- **Ganti kata sandi:** form (sandi saat ini, sandi baru, konfirmasi) → `POST /auth/change-password`.
- **Ganti email:** form (email baru, kata sandi) → `POST /auth/change-email`; tampilkan info "Cek email baru untuk verifikasi".
- **Status verifikasi email:** bila `user.email_verified === false`, tampilkan banner + tombol "Kirim ulang verifikasi" → `POST /auth/resend-verification`.

### 2.2 `/forgot-password` (publik)
Form email → `POST /auth/forgot-password`. Selalu tampilkan pesan sukses netral ("Jika email terdaftar, tautan reset telah dikirim") — jangan bocorkan keberadaan akun.

### 2.3 `/reset-password` (publik)
Ambil `token` dari query string. Form (sandi baru) → `POST /auth/reset-password` dengan `{ token, new_password }`. Sukses → arahkan ke `/login`.

### 2.4 `/verify-email` (publik)
Ambil `token` dari query → panggil `POST /auth/verify-email`. Tampilkan status berhasil/gagal + tautan lanjut.

## 3. API — `lib/api/auth.ts`

```ts
export const logout = () => apiFetch(`/auth/logout`, z.any(), { method: "POST" });
export const changePassword = (b: { current_password: string; new_password: string }) =>
  apiFetch(`/auth/change-password`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const forgotPassword = (b: { email: string }) =>
  apiFetch(`/auth/forgot-password`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const resetPassword = (b: { token: string; new_password: string }) =>
  apiFetch(`/auth/reset-password`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const changeEmail = (b: { new_email: string; password: string }) =>
  apiFetch(`/auth/change-email`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const verifyEmail = (b: { token: string }) =>
  apiFetch(`/auth/verify-email`, z.any(), { method: "POST", body: JSON.stringify(b) });
export const resendVerification = () =>
  apiFetch(`/auth/resend-verification`, z.any(), { method: "POST" });
```

> Hapus penyimpanan token di halaman login/register (tidak lagi simpan ke localStorage). Setelah login sukses, cukup `invalidateQueries(["me"])` lalu arahkan ke `next` / `/dashboard`.

## 4. Handler MSW

Tambah handler untuk endpoint baru (kembalikan `{ ok: true }`); untuk mode mock, `getMyProfile` mengembalikan pengguna demo agar dianggap login.

## 5. Definition of Done

- [ ] Tidak ada lagi referensi `localStorage` token; semua `fetch` pakai `credentials: "include"`.
- [ ] Status login berasal dari `useAuth()` (`/auth/me`); guard & aksi ber-auth memakai itu.
- [ ] Login/register/logout bekerja via cookie; menutup tab lalu buka lagi tetap login (cookie persist).
- [ ] Halaman ganti sandi, lupa sandi, reset, ganti email, verifikasi email berfungsi.
- [ ] Banner verifikasi muncul bila `email_verified=false`; kirim ulang berfungsi.
- [ ] Unggah file tetap jalan tanpa header Authorization (cookie ikut otomatis).
