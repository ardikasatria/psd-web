# Langkah 29 — Statistik Engagement (Suka, Bagikan, Unduh) + Ringkasan Profil Sumber Tunggal

> **Tujuan:** Setiap aset punya **suka**, **bagikan** (feed/forum/eksternal/salin-tautan), dan
> **unduh**, dengan counter di detail aset (gaya Kaggle). Profil menampilkan **agregat sumber tunggal**:
> total suka diterima, total dibagikan, total diunduh (gaya total suka universal TikTok).
> **Kerjakan setelah Langkah 15 (aset), 24 (sosial), 25 (gamifikasi).** *(Sesuaikan nomor langkah
> dengan roadmap PSD; ini melanjutkan 24/25.)*
>
> Logika inti **lulus 8 uji** di `psd-engagement/app/engagement/`.

---

## 29.1 Model — `app/modules/engagement/models.py`

Aset bersifat **polimorфик** → kunci `"<kind>:<slug>"`. Tiga tabel:

```python
class AssetEngagement(Base):                      # counter per aset (SUMBER per-aset)
    __tablename__ = "asset_engagement"
    asset_key: Mapped[str] = mapped_column(String, primary_key=True)   # "dataset:iris"
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    love_count: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    share_feed: Mapped[int] = mapped_column(Integer, default=0)
    share_forum: Mapped[int] = mapped_column(Integer, default=0)
    share_external: Mapped[int] = mapped_column(Integer, default=0)
    share_link: Mapped[int] = mapped_column(Integer, default=0)

class AssetLove(Base):                            # idempotensi suka (1 per aktor/aset)
    __tablename__ = "asset_loves"
    __table_args__ = (UniqueConstraint("user_id", "asset_key", name="uq_love"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    asset_key: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Ringkasan pengguna (SUMBER TUNGGAL profil)** — tambahkan ke `User` (atau tabel terpisah):

```python
total_loves_received: Mapped[int] = mapped_column(Integer, default=0, index=True)
total_shares: Mapped[int] = mapped_column(Integer, default=0)
total_downloads: Mapped[int] = mapped_column(Integer, default=0)
total_views: Mapped[int] = mapped_column(Integer, default=0)
```

> Opsional: tabel log `EngagementEvent` (append-only) untuk analitik/anti-fraud. Counter tetap
> sumber tampilan; log untuk audit & recompute.

```bash
docker compose exec backend alembic revision --autogenerate -m "engagement"
docker compose exec backend alembic upgrade head
```

## 29.2 Service (cermin scaffold teruji)

`counters.apply_love/apply_share/apply_download/apply_view`, `recompute_user_summary`,
`service.toggle_love/record_share/record_download`. Sambungkan seam `EngagementStore` & `Gamification`.

- **Suka idempoten** via `AssetLove`; toggle menambah/mengurangi counter & ringkasan pemilik.
- **Cegah suka aset sendiri** (422) — konsisten Langkah 25.
- **Reputasi ke pemilik** saat disukai orang lain (`like_received`); badge `populer` di 50 suka.
- **Bagikan** menambah per saluran + `total_shares` pemilik. **Unduh** menambah `download_count` + `total_downloads`.

## 29.3 Endpoint — `app/modules/engagement/router.py`

| Method | Path | Aksi |
|---|---|---|
| POST | `/assets/{kind}/{slug}/love` | Toggle suka → `{loved, love_count}`. 422 bila aset sendiri. |
| POST | `/assets/{kind}/{slug}/share` | `{channel}` (feed/forum/external/link) → `{share_count, shares}`. |
| POST | `/assets/{kind}/{slug}/download` | Catat unduhan → `{download_count}`. (atau panggil di endpoint unduh yang ada.) |
| POST | `/assets/{kind}/{slug}/view` | (opsional, throttle) catat tampilan. |
| GET | `/assets/{kind}/{slug}/stats` | Counter aset lengkap. |
| GET | `/users/{username}/stats` | **Agregat sumber tunggal**: `{total_loves_received, total_shares, total_downloads, total_views, asset_count}`. |

Sertakan `stats` aset di detail aset, dan ringkasan di `GET /users/{username}` & `/me`. Pakai `ApiError`.

## 29.4 Satukan yang sudah ada (penting — hindari counter ganda)

- **Suka aset lama** (Langkah 15/25 `like_received`) → arahkan lewat `toggle_love` ini (satu jalur).
- **"Bagikan ke feed"** (Langkah 24 sosial) → panggil `record_share(channel="feed")`.
- **Bagikan ke forum** → `record_share(channel="forum")`.
- **Bagikan eksternal / salin tautan** → `record_share(channel="external"|"link")`.
- **Endpoint unduh aset** (Langkah 15) → panggil `record_download`.
- Pastikan TIDAK ada penghitung suka/unduh terpisah yang lama; semua lewat modul ini.

## 29.5 Anti-abuse

- Suka **unik** per (aktor, aset) — `AssetLove`.
- Bagikan/unduh: pertimbangkan **dedupe per aktor/aset/saluran per hari** (parameter `dedupe`) agar tak
  digelembungkan; total tetap mencerminkan pemakaian wajar.
- Jangan hitung suka aset sendiri (dicegah).

## Pembaruan kontrak

- Detail aset **+** `stats {love_count, share_count, shares{...}, download_count, view_count, liked}`.
- Profil **+** `stats {total_loves_received, total_shares, total_downloads, total_views, asset_count}`.
- Endpoint love/share/download/stats seperti di atas.

## Selesai bila

- [ ] Suka/bagikan/unduh bekerja di tiap detail aset; counter akurat & optimistik di UI.
- [ ] Profil menampilkan agregat **sumber tunggal** yang konsisten dengan jumlah counter aset.
- [ ] Berbagi mendukung feed/forum/eksternal/salin-tautan; unduh tercatat.
- [ ] Suka idempoten; tak ada suka aset sendiri; reputasi/badge mengikuti Langkah 25.
- [ ] Tak ada penghitung lama yang berjalan paralel (satu jalur).
- [ ] Logika (cermin `psd-engagement/app/engagement/tests/`) hijau.

## Gotcha

- **Sumber tunggal**: ringkasan pengguna = jumlah counter aset; jaga inkремental DAN sediakan
  **job rekonsiliasi** (`recompute_user_summary`) berkala untuk koreksi drift.
- **Kunci polimorфик** `"<kind>:<slug>"` konsisten di seluruh pemanggil.
- **Idempotensi suka** lewat constraint unik; jangan menambah counter tanpa cek `AssetLove`.
- **Clamp ≥ 0** saat batal suka (sudah ditangani).
- **Satu jalur**: matikan penghitung suka/unduh lama agar tak dobel.
- **View bisa ramai** — throttle/sampling bila dipakai; jangan tulis DB tiap render.
