# PSD — Instruksi Cursor: Kompetisi — Submission, Kuota & Leaderboard Publik/Privat

> **Cara pakai:** Lampirkan bersama dokumen frontend. Mematangkan halaman kompetisi: unggah submission dengan kuota harian, dan leaderboard publik/privat. **Kerjakan setelah Item 1 (auth cookie).** Prasyarat: backend Langkah 19.

## 1. Skema & API

- `CompetitionDetailSchema` **+** `daily_submission_limit: z.number()`.
- `SubmitResultSchema = z.object({ id, created_at, status, public_score: z.number().nullable(), filename, remaining_today: z.number() })`.

```ts
// lib/api/competitions.ts
export const submitToCompetition = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return fetch(`${BASE}/api/v1/competitions/${slug}/submissions`,
    { method: "POST", body: fd, credentials: "include" })
    .then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw { status: r.status, ...(body.error ?? {}) };
      return body; // SubmitResult
    });
};
export const getLeaderboard = (slug: string, board: "public" | "private" = "public", page = 1) =>
  apiFetch(`/competitions/${slug}/leaderboard?board=${board}&page=${page}`, PaginatedLeaderboard);
export const getMyCompetitionSubmissions = (slug: string) =>
  apiFetch(`/competitions/${slug}/submissions`, PaginatedSubmission);
```

> Unggah pakai `FormData` + `credentials:"include"` (cookie auth), bukan `apiFetch`.

## 2. Tab Submission (halaman kompetisi)

Pada `/competitions/[slug]`, tab **Submission** (hanya untuk pengguna login):

- **Area unggah:** pilih/drag berkas prediksi (CSV). Tombol "Kirim submission".
- **Kuota harian:** tampilkan "Sisa hari ini: X" — perbarui dari `remaining_today` setelah submit.
- **Saat sukses:** tampilkan status (`Antre`/`Dinilai`/`Gagal`) + skor publik bila ada; `invalidateQueries` daftar submission & leaderboard.
- **Saat batas tercapai (`429 limit_reached`):** tampilkan pesan jelas "Batas N submission/hari tercapai. Coba lagi besok." dan nonaktifkan tombol.
- **Riwayat submission:** daftar dari `getMyCompetitionSubmissions` (waktu, status badge, skor publik). Jangan tampilkan skor privat di sini.

Bila kompetisi tidak `active`, sembunyikan area unggah dan tampilkan info status (akan datang / telah berakhir).

## 3. Tab Leaderboard publik/privat

Dua sub-tab:

- **Publik:** `getLeaderboard(slug, "public")` — selalu tersedia. Kolom: peringkat, peserta (avatar + username), skor, waktu.
- **Privat:**
  - Bila kompetisi **belum berakhir** (`status !== "past"`): tampilkan keadaan **terkunci** — ikon gembok + "Leaderboard privat dibuka setelah kompetisi berakhir" + hitung mundur ke `ends_at`. Jangan panggil endpoint (atau tangani `403 leaderboard_locked` dengan tampilan terkunci).
  - Bila **sudah berakhir**: `getLeaderboard(slug, "private")` dan tampilkan seperti publik, beri label "Hasil akhir".

Sorot baris milik pengguna sendiri bila ada.

## 4. Admin: ground truth & batas harian

Di form edit kompetisi (admin panel):
- Field **Batas submission/hari** (`daily_submission_limit`) → simpan via `PATCH /admin/competitions/{slug}`.
- **Unggah ground truth** (CSV `id,target,split`) → `POST /admin/competitions/{slug}/ground-truth` (FormData). Beri catatan format kolom.

## 5. Handler MSW

Tambah handler submit (kembalikan `remaining_today`; variasi `429` untuk menguji batas), leaderboard publik (data demo) & privat (kembalikan `403` saat kompetisi aktif, data saat past), serta riwayat submission.

## 6. Definition of Done

- [ ] Unggah submission berfungsi; "Sisa hari ini" akurat; batas memunculkan pesan & menonaktifkan tombol.
- [ ] Status & skor publik tampil; skor privat tidak pernah tampil sebelum kompetisi berakhir.
- [ ] Leaderboard publik tampil; privat terkunci (dengan hitung mundur) sampai berakhir, lalu terbuka sebagai hasil akhir.
- [ ] Admin dapat mengatur batas harian & mengunggah ground truth.
- [ ] Area unggah tersembunyi saat kompetisi tidak aktif; mode mock berfungsi.
