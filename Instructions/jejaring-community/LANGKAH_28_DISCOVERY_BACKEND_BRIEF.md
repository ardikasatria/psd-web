# Langkah 28 — Penemuan Komunitas (Panel Jejaring: Tier, Pencapaian, Populer, Baru, Afiliasi)

> **Tujuan:** Di `/community`, sajikan panel penemuan orang: **tier tertinggi**, **pencapaian**
> (badge terbaru), **popularitas** (pengikut/suka), **anggota baru**, dan **orang serupa** berdasarkan
> **afiliasi** (sesama Institut Teknologi Sumatera / sesama organisasi). **Kerjakan setelah Langkah 24
> (sosial) & 25 (gamifikasi).** Prasyarat: 24, 25.
>
> Logika inti **lulus 8 uji** di `psd-discovery/app/discovery/`.

---

## 28.1 Field & counter

**Afiliasi** pada `User` (bila belum ada):

```python
affiliation: Mapped[str | None] = mapped_column(String, nullable=True, index=True)  # mis. "Institut Teknologi Sumatera"
# organisasi memakai konsep yang ada (org_id/role org_admin); tambah org_name bila perlu untuk label
```

**Counter denormalisasi** untuk performa panel (hindari COUNT besar tiap permintaan):

```python
follower_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
post_like_total: Mapped[int] = mapped_column(Integer, default=0)   # total suka pada postingan pengguna
```

- Perbarui `follower_count` di pemicu follow/unfollow (Langkah 24).
- Perbarui `post_like_total` di pemicu like/unlike postingan (Langkah 24/25).
- (Alternatif: subquery agregasi bila volume kecil — tapi counter lebih skalabel.)

```bash
docker compose exec backend alembic revision --autogenerate -m "discovery_fields"
docker compose exec backend alembic upgrade head
```

## 28.2 Service — `app/modules/discovery/service.py`

Cermin scaffold (sudah teruji): `ranking.popularity_score/rank_by/new_members`,
`affinity.suggest_affiliation`, `panels.build_discovery`. Sediakan pool via query (seam):

- `top_tier_pool` — `User` urut `reputation` desc, limit.
- `popular_pool` — urut `follower_count` desc (atau skor gabungan), limit.
- `new_members_pool` — `created_at` desc dalam N hari, limit.
- `recent_achievements` — `UserBadge` terbaru (utamakan gold/silver) join `User`, limit; sertakan `top_badge`.
- `affiliation_pool` — kandidat berbagi `org_id` **atau** `affiliation` dengan `me` (prefilter DB),
  limit lebih besar (mis. 50) lalu disaring `suggest_affiliation`.
- `following_ids(me)` — untuk dikecualikan dari saran afiliasi.

## 28.3 Endpoint — `app/modules/discovery/router.py`

**Gabungan (untuk panel `/community`):**

```
GET /discovery/panels?limit=8
→ { top_tier:[ref], popular:[ref], new_members:[ref], achievements:[ref], affiliation:[ref] }
```
- `ref` = `{username, type, avatar_url, is_official, reputation, tier, reason}`.
- Personal bila login: kecualikan diri; panel `affiliation` terisi bila pengguna punya afiliasi/org &
  mengecualikan yang sudah diikuti. Anonим: `affiliation` kosong.

**"Lihat semua" (paginated, opsional tapi disarankan):**

```
GET /discovery/top-tier?page=        # = leaderboard kontributor (Langkah 25) — boleh pakai ulang
GET /discovery/popular?page=
GET /discovery/new?page=
GET /discovery/achievements?page=
GET /discovery/similar?page=         # afiliasi; butuh login
```

Pakai `paginated()` & `ApiError`. Cache ringan `/discovery/panels` (mis. 60 dtk) bila perlu —
ukur dulu (reaktif).

## 28.4 Privasi

- Tampilkan hanya info profil publik. Hormati pengguna yang menyembunyikan profil (bila ada flag
  privasi) — kecualikan dari panel.
- Panel **afiliasi** hanya untuk pengguna login; jangan bocorkan afiliasi orang ke anonim di luar
  yang sudah publik di profil.

## Selesai bila

- [ ] `/discovery/panels` mengembalikan kelima panel dengan `reason` tiap entri; diri dikecualikan.
- [ ] Panel afiliasi mencocokkan sesama org/institusi, mengecualikan yang sudah diikuti.
- [ ] Counter `follower_count`/`post_like_total` terjaga oleh pemicu Langkah 24/25.
- [ ] "Lihat semua" paginated untuk tiap kategori.
- [ ] Logika (cermin `psd-discovery/app/discovery/tests/`) hijau.

## Gotcha

- **Counter denormalisasi** harus dijaga konsisten di pemicu sosial; selisih kecil tak fatal untuk panel.
- **Kecualikan diri & yang sudah diikuti** dari saran (sudah ditangani logika) agar ajakan follow relevan.
- **Afiliasi cocok via org_id (eksak) ATAU teks affiliation (case-insensitive)** — normalkan teks.
- **Cold-start**: bila pool afiliasi kosong, panel kosong — frontend tampilkan alternatif (populer/baru).
- **Jangan over-optimasi**: cache hanya bila terbukti lambat (strategi reaktif PSD).
