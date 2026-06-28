# PSD — Instruksi Cursor: Lingkaran Terpandu + Quest (Frontend)

> **Cara pakai:** Lampirkan bersama dokumen frontend. Halaman quest, progres, widget "Langkah berikutnya", dan CTA kontekstual lingkaran. **Kerjakan setelah backend Langkah 34.**

## 1. Skema & API

```ts
export const QuestStepSchema = z.object({ id: z.string(), title: z.string(), type: z.string(),
  target: z.any().nullable().optional(), description: z.string().optional(), done: z.boolean().optional() });
export const QuestSchema = z.object({ slug: z.string(), title: z.string(), description: z.string(),
  steps: z.array(QuestStepSchema), progress: z.object({ done: z.number(), total: z.number() }),
  reward_reputation: z.number(), reward_badge: z.string().nullable(),
  complete: z.boolean(), claimed: z.boolean(), claimable: z.boolean() });

// lib/api/quests.ts
export const getMyQuests = () => apiFetch(`/me/quests`, z.object({ items: z.array(QuestSchema) }));
export const claimQuest = (slug: string) => apiFetch(`/me/quests/${slug}/claim`, z.any(), { method: "POST" });
export const getJourney = () => apiFetch(`/me/journey`, z.object({ next: z.object({ title: z.string(), description: z.string(), cta_link: z.string() }) }));
```

## 2. Widget "Langkah berikutnya" (dashboard)

Komponen menonjol di dashboard dari `getJourney()`: tampilkan kartu langkah berikutnya (judul, deskripsi, tombol CTA → `cta_link`). Ini membuat **lingkaran selalu terlihat** — selalu ada "apa selanjutnya".

## 3. Halaman Quest — `/quests`

Dari `getMyQuests()`:
- Daftar quest sebagai kartu dengan **bar progres** ("2/4") dan label hadiah (reputasi/badge).
- Quest selesai & belum diklaim → sorot + tombol **Klaim hadiah**.

## 4. Detail quest

- Daftar langkah dengan **ikon centang** (done/undone) + deskripsi tiap langkah.
- Tiap langkah belum selesai → tautan ke aksinya (peta `type` → rute):
  - `complete_course/path` → `/learn`, `submit_competition` → `/competitions`, `publish_asset` → `/projects/new`, `make_post` → `/community`, `follow_user` → cari orang, `reach_reputation` → `/me/gamification`.
- Bila `claimable` → tombol **Klaim** (`claimQuest`) → toast hadiah + invalidate `["me","gamification"]` & quests.

## 5. CTA kontekstual lingkaran (perekat)

Tampilkan "langkah berikutnya" di titik-titik alami:
- **Selesai course** (semua lesson tuntas) → kartu "Langkah berikutnya: buktikan di kompetisi" (tautan kompetisi; bila kategori cocok, filter `?category=`).
- **Submission dinilai** → "Bangun portofolio: terbitkan dataset/model dari eksperimenmu".
- **Aset diterbitkan** → "Tantang dirimu: ikuti kompetisi" / "Bagikan ke feed".
Gunakan `getJourney()` atau aturan sederhana berbasis kategori artefak.

## 6. Admin: kelola quest (staf)

Halaman `/admin/quests`: tabel quest + editor (judul, deskripsi, **langkah** [tipe, target, judul], hadiah reputasi/badge, aktif). Tipe langkah dari kontrak. Tambah ke nav admin.

## 7. Handler MSW

Tambah handler `/me/quests` (campuran progres, satu `claimable`), `/me/quests/{slug}/claim`, `/me/journey`, dan admin quests.

## 8. Definition of Done

- [ ] Widget "Langkah berikutnya" tampil di dashboard & mengarahkan aksi.
- [ ] Halaman & detail quest menampilkan progres terverifikasi; klaim memberi hadiah sekali.
- [ ] CTA kontekstual muncul di titik lingkaran (selesai course → kompetisi, dst.).
- [ ] Staf dapat membuat/ubah quest.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
