# Langkah 30 — Koleksi "Aset Disukai" dengan Visibilitas (Publik/Privat)

> **Tujuan:** Pengguna melihat **aset yang ia sukai** (hanya aset — **bukan** feed/forum) dan mengatur
> visibilitas koleksi: **master** (publik/privat) + **per-item** (tandai aset mana yang tampil ke publik).
> **Kerjakan setelah Langkah 29 (engagement/suka aset).** Prasyarat: 24, 29.
>
> Logika inti **lulus 8 uji** di `psd-liked-assets/app/liked/`.

---

## 30.1 Model

Sumber daftar = **`AssetLove`** (Langkah 29). Tambahkan visibilitas per-item + pengaturan master.

```python
# tambah kolom ke AssetLove (Langkah 29)
is_public: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

# pengaturan master per pengguna (di User atau tabel terpisah)
liked_list_public: Mapped[bool] = mapped_column(Boolean, default=True)   # master
liked_default_public: Mapped[bool] = mapped_column(Boolean, default=True) # default item baru
```

```bash
docker compose exec backend alembic revision --autogenerate -m "liked_visibility"
docker compose exec backend alembic upgrade head
```

> Daftar HANYA berisi suka **aset** (dataset/model/notebook/course/…). Suka **postingan feed** &
> **forum** memakai tabel like terpisah (Langkah 24) → otomatis tak masuk. Tetap jaga `is_asset_key`.

## 30.2 Service (cermin scaffold teruji)

`visibility.is_asset_key/visible_to/filter_for_viewer/public_count`,
`service.list_for_viewer/set_item_visibility/set_list_settings/on_asset_liked/public_summary`.

- **Visibilitas efektif ke orang lain** = `list_public` (master) **DAN** `item.is_public`.
- **Pemilik selalu** melihat seluruh daftarnya.
- **Saat menyukai aset** (engagement Langkah 29) → panggil `on_asset_liked` agar item baru memakai
  `liked_default_public`.

## 30.3 Endpoint — `app/modules/liked/router.py`

| Method | Path | Aksi |
|---|---|---|
| GET | `/me/liked-assets` | Daftar lengkap milik sendiri (dengan `is_public` tiap item) + paginasi. |
| GET | `/users/{username}/liked-assets` | Daftar **publik** pengguna lain: hanya bila `liked_list_public` & item `is_public`. Kosong bila master privat. |
| PATCH | `/me/liked-assets/{kind}/{slug}/visibility` | `{is_public}` → `set_item_visibility`. 422 bila bukan aset; 404 bila tak di daftar. |
| PATCH | `/me/settings/liked-list` | `{list_public?, default_public?}` → `set_list_settings`. |
| GET | `/users/{username}/liked-assets/summary` | `{list_public, public_count, total_count}` (untuk badge profil). |

`asset_key = f"{kind}:{slug}"`. Sertakan detail ringkas aset (judul, kind, owner, stats) saat menampilkan.
Pakai `paginated()` & `ApiError`.

## 30.4 Integrasi

- **Engagement (Langkah 29)**: di `toggle_love` saat `loved=True`, panggil `liked.on_asset_liked`.
  Saat batal suka, item hilang dari daftar (mengikuti `AssetLove`).
- **Profil**: tampilkan tab "Aset Disukai" + ringkasan `public_count` (hormati master switch).

## Pembaruan kontrak

- Item aset disukai **+** `is_public`.
- Profil **+** pengaturan `liked_list_public`, `liked_default_public` & endpoint daftar/summary.

## Selesai bila

- [ ] Pengguna melihat aset yang ia sukai (bukan feed/forum) di profilnya.
- [ ] Master publik/privat berfungsi; per-item publik/privat berfungsi; efektif = master AND item.
- [ ] Pengguna lain hanya melihat item publik (dan kosong bila master privat); pemilik lihat semua.
- [ ] Item baru mengikuti `default_public`; batal suka menghapus dari daftar.
- [ ] Logika (cermin `psd-liked-assets/app/liked/tests/`) hijau.

## Gotcha

- **Hanya aset**: jangan pernah masukkan `post:`/`thread:`/`comment:` (dijaga `is_asset_key`).
- **Visibilitas efektif = master AND item** — jangan lupa master switch saat memfilter.
- **Pemilik selalu lihat semua** miliknya (jangan filter untuk diri sendiri).
- **Sinkron dengan AssetLove**: daftar mengikuti suka; batal suka = keluar daftar (jangan biarкан yatim).
- **Privasi**: endpoint publik tak boleh membocorkan item privat / daftar privat.
