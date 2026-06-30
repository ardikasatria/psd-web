# PSD — Instruksi Cursor: Detail Kompetisi (Gaya Kaggle)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menyempurnakan **halaman detail kompetisi**
> (`/competitions/{slug}`): tab Overview/Data/Notebook/Leaderboard/Submission/Tim, **bar progres
> deadline**, statistik, favorit notebook, dan **panel review admin humas**. **Kerjakan setelah sosial,
> notebook, & engagement.** Prasyarat: backend Langkah 32.

## 1. Skema & API

```ts
export const DeadlineProgressSchema = z.object({
  phase: z.enum(["upcoming", "active", "ended"]), progress: z.number(),
  remaining_seconds: z.number(), remaining_text: z.string(), is_open: z.boolean(),
});
export const CompetitionStatsSchema = z.object({
  participants: z.number(), teams: z.number(), submissions: z.number(),
  scored: z.number(), pending_review: z.number(), notebooks: z.number(),
});
export const LeaderRowSchema = z.object({
  rank: z.number(), score: z.number(),
  entrant: z.object({ kind: z.enum(["team", "user"]), name: z.string(), avatar_url: z.string().nullable() }),
  submitted_at: z.string(),
});
export const SubmissionSchema = z.object({
  id: z.string(), status: z.enum(["submitted", "under_review", "scored", "rejected"]),
  score: z.number().nullable(), note: z.string().nullable(), review_note: z.string().nullable(),
  submitted_at: z.string(),
});
export const CompNotebookSchema = z.object({
  id: z.string(), title: z.string(), owner: OwnerRefSchema,
  favorite_count: z.number(), favorited: z.boolean(), updated_at: z.string(),
});

// lib/api/competition.ts
export const getCompetition = (slug: string) => apiFetch(`/competitions/${slug}`, CompetitionDetailSchema);
export const getLeaderboard = (slug: string, page = 1) => apiFetch(`/competitions/${slug}/leaderboard?page=${page}`, PaginatedLeader);
export const getCompStats = (slug: string) => apiFetch(`/competitions/${slug}/stats`, CompetitionStatsSchema);
export const getCompNotebooks = (slug: string, page = 1) => apiFetch(`/competitions/${slug}/notebooks?page=${page}`, PaginatedCompNotebook);
export const createCompNotebook = (slug: string) => apiFetch(`/competitions/${slug}/notebooks`, CompNotebookSchema, { method: "POST" });
export const favoriteCompNotebook = (slug: string, id: string) =>
  apiFetch(`/competitions/${slug}/notebooks/${id}/favorite`, z.object({ favorited: z.boolean(), favorite_count: z.number() }), { method: "POST" });
export const submitEntry = (slug: string, body: { team_id?: string; notebook_id?: string; note?: string }) =>
  apiFetch(`/competitions/${slug}/submissions`, SubmissionSchema, { method: "POST", body: JSON.stringify(body) });
export const getMySubmissions = (slug: string) => apiFetch(`/competitions/${slug}/submissions/me`, z.array(SubmissionSchema));
// admin humas
export const adminListSubs = (slug: string, status = "submitted", page = 1) =>
  apiFetch(`/admin/competitions/${slug}/submissions?status=${status}&page=${page}`, PaginatedAdminSub);
export const adminScore = (slug: string, id: string, body: { score: number; note?: string }) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/score`, z.any(), { method: "POST", body: JSON.stringify(body) });
export const adminReject = (slug: string, id: string, note?: string) =>
  apiFetch(`/admin/competitions/${slug}/submissions/${id}/reject`, z.any(), { method: "POST", body: JSON.stringify({ note }) });
```

## 2. Header kompetisi + bar progres deadline

- Judul, penyelenggara, hadiah, metrik (mis. "Akurasi — makin tinggi makin baik").
- **Bar progres deadline** dari `getCompetition().deadline` (`progress`, `remaining_text`, `phase`):
  - upcoming → "Dibuka dalam …"; active → bar terisi `progress` + "Berakhir dalam {remaining_text}";
    ended → "Kompetisi selesai".
- Tombol **Gabung / Submit** (nonaktif bila `is_open=false`).

## 3. Tab

1. **Overview** — deskripsi + statistik (`getCompStats`: peserta, tim, submission, dinilai, menunggu review, notebook).
2. **Data** — berkas dataset kompetisi (unduh).
3. **Notebook** — daftar **notebook kompetisi** (`getCompNotebooks`, **urut favorit**). Tombol **Buat
   notebook** (`createCompNotebook` → buka editor notebook Langkah 52b dengan konteks kompetisi). Tiap
   kartu: judul, pemilik, **tombol favorit ❤** (`favoriteCompNotebook`, optimistik) + `favorite_count`.
   **Yang paling banyak favorit tetap di atas.**
4. **Leaderboard** — `getLeaderboard`: rank, peserta (tim/solo), skor, waktu. Tandai baris milik Anda/tim.
5. **Submission** — `getMySubmissions`: daftar submission Anda + **status** (submitted/under_review/
   scored/rejected) + skor + catatan review. Tombol **Submit baru** (pilih tim & notebook bila ada).
6. **Tim** — tim peserta; buat/gabung tim (modul Teams).

## 4. Submit & status

- Form submit: pilih **tim** (atau solo), notebook sumber (opsional), catatan. Bila `is_open=false` →
  tombol nonaktif + pesan "Pendaftaran/Submission ditutup".
- Setelah submit → status `submitted`; tampilkan jelas bahwa **menunggu penilaian admin** (bukan skor instan).

## 5. Panel admin humas (rute admin)

- **Antrian review** (`adminListSubs`, tab status). Tiap submission: peserta, waktu, notebook/berkas,
  catatan. Aksi: **Mulai review**, **Beri skor** (input skor dalam rentang `max_score` + catatan →
  `adminScore`), **Tolak** (`adminReject`), **Buka kembali**.
- Validasi skor di klien (angka, ≤ max_score); tampilkan error 422 dari server (rentang/format).
- Setelah skor → submission masuk leaderboard; perbarui daftar.

## 6. Handler MSW

Tambah handler semua endpoint: competition detail (upcoming/active/ended), stats, leaderboard (max & min
metric), notebooks (urut favorit + toggle), submit (sukses & deadline tutup), my submissions (berbagai
status), admin list/score/reject (ubah status & skor).

## 7. Definition of Done

- [ ] Bar progres deadline + fase benar; tombol submit nonaktif saat ditutup.
- [ ] Tab Notebook menampilkan notebook kompetisi **urut favorit**; favorit optimistik menaikkan urutan.
- [ ] Submit (solo/tim) membuat submission `submitted`; status tampil jelas (menunggu penilaian).
- [ ] **Admin humas menilai** submission (skor/tolak/reopen); leaderboard memakai yang `scored`.
- [ ] Statistik & leaderboard akurat (termasuk metrik min/max).
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
