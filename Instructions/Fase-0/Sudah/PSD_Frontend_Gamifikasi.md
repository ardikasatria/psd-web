# PSD — Instruksi Cursor: Gamifikasi (Tier, Badge, Hak, Leaderboard Kontributor)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Menampilkan reputasi/tier, badge, hak/batas, dan papan peringkat kontributor. **Kerjakan setelah Item 1 & backend Langkah 24.**

## 1. Skema & API

```ts
export const TierSchema = z.object({ level: z.number(), name: z.string(), reputation: z.number(), next_at: z.number().nullable() });
export const PerksSchema = z.object({ upload_max_mb: z.number(), daily_submission_bonus: z.number(),
  notebook_quota: z.number(), event_priority: z.boolean(), can_create_event: z.boolean() });
export const BadgeSchema = z.object({ id: z.string(), name: z.string(), tier: z.enum(["bronze","silver","gold"]), description: z.string(), earned: z.boolean() });
export const GamificationSchema = z.object({ tier: TierSchema, perks: PerksSchema, badges: z.array(BadgeSchema) });

// ProfileSchema + reputation, tier (TierSchema), badges: string[]
// lib/api/gamification.ts
export const getMyGamification = () => apiFetch(`/me/gamification`, GamificationSchema);
export const getContributors = (page = 1) => apiFetch(`/leaderboard/contributors?page=${page}`, PaginatedContributor);
```

## 2. Di halaman profil

- **Lencana tier** di samping nama (mis. "Ahli") dengan warna tier; tampilkan `reputation`.
- **Grid badge** yang diraih (ikon + nama; hover = deskripsi). Pakai warna bronze/silver/gold.

## 3. Halaman "Pencapaian saya" — `/me/gamification` (atau tab di profil/pengaturan)

Dari `getMyGamification()`:
- **Progres ke tier berikutnya:** bar dari `tier.reputation` menuju `tier.next_at` (atau "Tier tertinggi").
- **Grid semua badge:** earned berwarna, belum-earned redup + deskripsi cara meraih (mendorong aksi).
- **Hak Anda (perks):** tampilkan daftar batas saat ini agar transparan:
  - "Ukuran upload maks: {upload_max_mb} MB"
  - "Bonus submission/hari: +{daily_submission_bonus}"
  - "Kuota notebook: {notebook_quota}"
  - "Prioritas event: {event_priority ? 'Ya' : 'Belum'}"
  - "Buat event: {can_create_event ? 'Ya' : 'Belum'}"
  Beri petunjuk halus tier mana yang membuka tiap hak (motivasi naik level).

## 4. Tampilkan batas di tempat aksi (transparansi)

- **Form upload aset:** "Batas upload Anda: {upload_max_mb} MB (tier {nama})". Validasi sisi klien sebelum kirim.
- **Submit kompetisi:** tampilkan total batas harian (limit dasar + bonus tier).
- **Buat notebook:** bila kuota tercapai, jelaskan & arahkan cara menaikkan tier.
- **Event penuh + punya prioritas:** beri tahu "Kursi prioritas tier {nama} — Anda tetap terdaftar".

Ambil `perks` sekali (mis. dari `getMyGamification`) dan bagikan via context/query cache.

## 5. Papan Peringkat Kontributor — `/leaderboard` atau `/community/leaderboard`

Tabel dari `getContributors()`: peringkat, peserta (avatar + username + badge resmi), tier, reputasi. Sorot baris pengguna sendiri. (Pertimbangkan label "Bulan ini" bila nanti dibuat time-boxed.)

## 6. Umpan balik saat reputasi/badge bertambah

Setelah aksi yang memberi poin (mis. terbit aset, submission dinilai), `invalidateQueries(["me"])` & `["me","gamification"]`. Bila badge baru diraih, tampilkan toast perayaan ringan ("Badge baru: Langkah Pertama!"). Jaga selera — jangan berlebihan; hormati `reduced_motion`.

## 7. Handler MSW

Tambah handler `/me/gamification` (tier menengah + campuran badge earned/locked) & `/leaderboard/contributors`. Set `reputation`/`tier`/`badges` pada profil mock.

## 8. Definition of Done

- [ ] Profil menampilkan tier, reputasi, dan badge yang diraih.
- [ ] `/me/gamification`: progres ke tier berikutnya, grid badge (earned vs cara meraih), dan daftar hak/batas.
- [ ] Batas (upload, submission, notebook, prioritas event) tampil transparan di tempat aksinya.
- [ ] Papan peringkat kontributor tampil; baris sendiri tersorot.
- [ ] Toast badge baru hadir secukupnya; `reduced_motion` dihormati.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
