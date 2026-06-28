# PSD — Instruksi Cursor: Konsistensi Mutu & Legal/Privasi

> **Cara pakai:** Lampirkan bersama dokumen frontend. Pass lintas-fitur: state seragam, aksesibilitas, halaman legal, dan UX rate-limit. **Kerjakan setelah fitur inti.** Prasyarat: backend Langkah 26.

## 1. State seragam (loading / kosong / error)

Buat satu pembungkus `components/common/QueryView.tsx` dan pakai di **semua** tampilan data:

```tsx
export function QueryView<T>({ query, skeleton, empty, children }: {
  query: { isLoading: boolean; isError: boolean; data?: T; refetch: () => void };
  skeleton?: React.ReactNode; empty: React.ReactNode; children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <>{skeleton ?? <ThemeSkeleton />}</>;
  if (query.isError) return (
    <ThemeError>
      <p>Gagal memuat. Coba lagi.</p>
      <ThemeButton onClick={() => query.refetch()}>Muat ulang</ThemeButton>
    </ThemeError>
  );
  const d = query.data as any;
  const isEmpty = d == null || (Array.isArray(d?.items) && d.items.length === 0);
  return <>{isEmpty ? empty : children(query.data as T)}</>;
}
```

**Audit:** ganti penanganan state ad-hoc di seluruh halaman/list (aset, kompetisi, event, course, forum, feed, profil, dashboard, pencarian, admin) agar memakai `QueryView` + `EmptyState` (komponen onboarding). Tujuan: pengalaman seragam, tak ada layar kosong tanpa konteks.

## 2. UX rate-limit & error global

- Di `apiFetch`, tangani `429 rate_limited`: lempar error dengan pesan ramah; di pemicunya tampilkan toast "Terlalu banyak permintaan, coba lagi sebentar lagi" dan nonaktifkan tombol sejenak.
- Tampilkan `error.message` dari amplop `{ error: { code, message } }` secara konsisten (toast/inline), bukan pesan teknis mentah.

## 3. Aksesibilitas (checklist wajib)

- **Gambar:** `alt` bermakna pada avatar, banner, gambar postingan, cover (kosongkan `alt=""` untuk dekoratif).
- **Tombol ikon** (suka, ikuti, hapus, dll.): beri `aria-label`. Status toggle pakai `aria-pressed`.
- **Form:** setiap input punya `<label>` terkait; error terkait via `aria-describedby`.
- **Keyboard:** semua aksi dapat di-Tab & di-Enter; jangan ada `onClick` pada elemen non-fokus tanpa `role`/`tabindex`.
- **Fokus terlihat:** jangan hapus outline fokus; pastikan kontras cukup.
- **Modal/dialog:** focus trap, tutup dengan Esc, kembalikan fokus saat ditutup.
- **Toast/notifikasi:** wadah `aria-live="polite"`.
- **Lewati ke konten:** tautan "Lewati ke konten" di awal halaman.
- **Kontras warna:** patuhi WCAG AA; perhatikan teks di atas accent color/banner.
- **Gerak:** hormati `prefers-reduced-motion` **dan** setelan `reduced_motion` pengguna (Langkah 23).
- **Bahasa:** `<html lang="id">` (atau sesuai setelan bahasa).

## 4. Halaman legal (statis)

> **PENTING:** Ini kerangka, **bukan** teks hukum final. Wajib ditinjau penasihat hukum agar patuh **UU PDP No. 27/2022** dan **UU ITE**. Jangan diluncurkan tanpa peninjauan.

Rute (markdown, dirender komponen markdown):

| Rute | Bagian yang perlu ada |
|---|---|
| `/legal/ketentuan-layanan` | Ruang lingkup layanan; kewajiban & larangan pengguna; hak kekayaan intelektual & lisensi konten yang diunggah; moderasi & penangguhan akun; penafian & batasan tanggung jawab; perubahan ketentuan; hukum yang berlaku (Indonesia) |
| `/legal/kebijakan-privasi` | Data yang dikumpulkan (akun, konten, log); dasar & tujuan pemrosesan; penyimpanan & lokasi data; berbagi dengan pihak ketiga; hak subjek data (akses, koreksi, hapus) sesuai UU PDP; keamanan; cookie; kontak Pengendali Data |
| `/legal/pedoman-komunitas` | (sudah ada di Langkah 18) — tautkan |

- **Footer**: tautkan ketiga halaman.
- **Saat register**: checkbox wajib "Saya menyetujui Ketentuan Layanan & Kebijakan Privasi" → kirim `accept_tos: true`. Tombol daftar nonaktif sampai dicentang.
- **Re-persetujuan**: bila `me.accepted_tos_version !== me.tos_current`, tampilkan banner/modal meminta persetujuan ulang → `POST /me/accept-tos`.
- **Cookie/penyimpanan**: beri pemberitahuan singkat soal cookie sesi (auth httpOnly) bila diperlukan.

## 5. Handler MSW

Tambah handler `/me/accept-tos`; sertakan `accepted_tos_version`/`tos_current` di profil mock untuk menguji alur re-persetujuan.

## 6. Definition of Done

- [ ] Semua tampilan data memakai `QueryView` + `EmptyState`; tidak ada state ad-hoc tersisa.
- [ ] `429` & error amplop ditangani ramah & konsisten.
- [ ] Checklist aksesibilitas terpenuhi (alt, label, keyboard, fokus, kontras, reduced-motion, lang).
- [ ] Halaman ToS & Kebijakan Privasi ada, tertaut di footer & register; checkbox persetujuan wajib.
- [ ] Re-persetujuan terpicu saat versi ToS berubah.
- [ ] Teks legal ditandai untuk peninjauan hukum sebelum peluncuran.
