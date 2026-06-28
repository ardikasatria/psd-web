# Brief Agen Cursor — Langkah 50: Integrasi Git (Gitea) 🔴

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Kerjakan Langkah 50 sesuai brief. Mulai dari **Langkah 0 — Orientasi repo**, laporkan temuan, lalu tanyakan hal ambigu SEBELUM menulis kode. Ini perubahan model penyimpanan repo — kerjakan NON-DESTRUKTIF & bertahap."*
>
> Spesifikasi, bukan kode tempel. Sesuaikan ke repo PSD (model repo + `files[]`, OAuth Langkah 48,
> storage MinIO Langkah 15, Docker). Scaffold referensi **lulus 6 uji** ada di `psd-gitea/app/gitea/`.

> ⚠️ **Ini item 🔴 (berat) — sistem infrastruktur penuh.** Estimasi di sini KERANGKA, bukan ukuran pasti.
> Pecah jadi sub-langkah nyata, kerjakan bertahap, jangan sekali jadi.

---

## 1. Tujuan & batasan

Ganti unggah file datar (`files[]`) dengan **versioning Git nyata** (clone/push/branch/riwayat/LFS)
berbasis Gitea. PSD jadi lapisan orkestrasi; Gitea jadi penyimpanan repo sebenarnya.

**Prasyarat:** Langkah 48 (OAuth/OIDC PSD) untuk SSO Gitea; Langkah 15 (storage/MinIO) untuk LFS.

**Catatan jujur (roadmap):** ini *bukan penyempurnaan* — model penyimpanan berubah. Wajib
non-destruktif: dual-write dulu, backfill, verifikasi, baru pindah source of truth. `files[]` lama
**jangan dihapus** sampai yakin.

---

## 2. Keputusan desain (dikunci kecuali ada alasan kuat)

1. **Gitea sebagai layanan terpisah** (container + DB). PSD bicara via **Gitea HTTP API v1** dgn **token admin**.
2. **SSO via OIDC**: Gitea memakai **PSD sebagai provider** (klien `gitea` yang sudah di-seed di Langkah 48).
   Login Gitea = login PSD. Bukan sistem identitas baru.
3. **LFS aktif**, disimpan ke **MinIO** (storage Langkah 15) — bukan disk lokal.
4. **Namespace kepemilikan**: default **satu akun Gitea per pengguna PSD** (`NAMESPACE_MODE="user"`),
   dibuat via admin API & ditautkan OIDC (`sub`/username). Alternatif: satu **org** untuk semua repo.
5. **Migrasi bertahap & non-destruktif**: dual-write → backfill → flip `source_of_truth` per repo.
6. **Impor awal via batch ChangeFiles** (satu commit banyak file, konten base64), bukan per-file.

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

Telusuri & **laporkan**; ambigu → **berhenti & tanya**.

- [ ] Model repo PSD: field `slug`/nama, pemilik, visibilitas (privat/publik), dan **bentuk `files[]`**
      (path + konten; teks atau biner?).
- [ ] Di mana repo PSD **dibuat** (titik hook untuk provisioning Gitea) & di mana file **diubah**
      (titik dual-write).
- [ ] Bagaimana UI saat ini menampilkan file repo (untuk diganti ke daftar/diff via Gitea API).
- [ ] Status Langkah 48: klien `gitea` sudah ter-seed? `redirect_uri` Gitea benar
      (`<gitea>/user/oauth2/PSD/callback`)? Discovery URL PSD bisa diakses Gitea?
- [ ] Storage Langkah 15: kredensial & bucket MinIO untuk LFS.
- [ ] Docker/compose: cara menambah service `gitea` + DB-nya; jaringan internal ke PSD & MinIO.
- [ ] Username PSD: apakah stabil & valid sebagai username Gitea (atau perlu normalisasi)?

**Pertanyaan untuk manusia:**
1. **Namespace**: per-user account atau satu org? (Memengaruhi auto-link OIDC & izin.)
2. Repo privat by default? Bagaimana pemetaan visibilitas PSD→Gitea?
3. Strategi auto_init: buat repo dengan README lalu impor (timpa), atau impor tanpa auto_init?
4. Jadwal **flip** source of truth: per-repo manual setelah verifikasi, atau batch?

---

## 4. Sub-langkah (akan pecah lebih lanjut — ini kerangka)

### 50.1 — Deploy Gitea + DB + LFS
- Service `gitea` (container) + DB (Postgres/MySQL) di compose; volume data persisten.
- **LFS**: `[server] LFS_START_SERVER=true`; `[lfs] STORAGE_TYPE=minio` + kredensial MinIO (Langkah 15).
- Buat **token admin** Gitea → `PSD_GITEA_ADMIN_TOKEN`.

### 50.2 — Provisioning repo padanan (sub-langkah 2)
- Cermin `provisioning.py`: saat repo PSD dibuat → `ensure_owner` (buat user Gitea bila perlu)
  → `create_user_repo`/`create_org_repo` → **simpan `clone_url` & `gitea_repo_id`** ke repo PSD (seam).
- Idempoten: aman bila dipanggil ulang.

### 50.3 — Jembatan auth (sub-langkah 3)
- **OIDC source di Gitea** (sekali, ops): 
  `gitea admin auth add-oauth --name PSD --provider openidConnect --auto-discover-url <ISSUER>/.well-known/openid-configuration --key gitea --secret <secret-Langkah48>`
- Verifikasi: login Gitea via PSD berhasil; akun ter-link ke `sub` PSD.
- (Opsional) token per-repo/per-user via `POST /users/{username}/tokens` bila ada alur yang butuh.

### 50.4 — Migrasi repo lama (sub-langkah 4) — NON-DESTRUKTIF
- **Dual-write** (fase A): repo baru otomatis dibuat di Gitea; tulisan PSD dicerminkan (`mirror_write`);
  `files[]` tetap source of truth.
- **Backfill** (fase B): skrip satu-kali `migration.backfill_all` → tiap repo lama: provision + `import_repo`
  (files[] → satu commit). Catat repo gagal, lanjutkan sisanya.
- **Flip** (fase C): setelah verifikasi per repo, `set_source_of_truth='gitea'`. Baca/tulis pindah ke Gitea.
- **Rollback**: `files[]` dipertahankan sampai yakin.

### 50.5 — Tampilan file/diff (sub-langkah 5)
- Cermin `files_view.py`: `list_files`, `get_file_text`, `get_diff` via Gitea API → endpoint PSD utk UI.

---

## 5. Seam integrasi

| Seam | Fungsi | Tugas agen |
|---|---|---|
| Repo→Gitea | `repo_slug`, `owner_username`, `owner_email` | Petakan objek repo PSD ke nama/pemilik Gitea. |
| Tautan | `save_gitea_link(repo, clone_url, gitea_repo_id)` | Simpan ke baris repo PSD (tambah kolom bila perlu). |
| File lama | `get_legacy_files(repo) -> [{path, content}]` | Baca `files[]` lama untuk impor. |
| Source of truth | `set_source_of_truth(repo, 'psd'\|'gitea')` | Flag per repo; default 'psd', flip setelah verifikasi. |
| Iterasi | `iter_legacy_repos()` | Yield repo yang perlu backfill. |

---

## 6. Definition of Done

- [ ] Gitea + DB + LFS(→MinIO) jalan di compose; token admin tersimpan aman.
- [ ] Login Gitea via OIDC PSD berhasil (tak ada login terpisah).
- [ ] Repo PSD baru → otomatis ada padanan di Gitea; `clone_url`+`gitea_repo_id` tersimpan.
- [ ] Clone/push/branch/riwayat berfungsi; file >batas masuk LFS.
- [ ] Backfill mengimpor `files[]` lama jadi commit awal; repo gagal tercatat, tidak menghentikan batch.
- [ ] `source_of_truth` dapat di-flip per repo; `files[]` lama dipertahankan (rollback aman).
- [ ] UI menampilkan daftar file & diff via Gitea API.
- [ ] Uji (cermin `psd-gitea/app/gitea/tests/test_gitea.py`) hijau.

---

## 7. Non-goals (bukan di Langkah 50)

- **Pull Request & review** → itu **Langkah 51** (butuh git nyata ini dulu).
- Mirroring/replikasi multi-region, webhook CI, dan kebijakan proteksi branch lanjutan.
- Migrasi riwayat commit dari sistem lama (tak ada — `files[]` jadi commit awal saja).

---

## 8. Gotcha (dari verifikasi scaffold)

- **Impor ke repo kosong**: contents API butuh branch. Pakai `auto_init=True` (ada `main`) lalu impor;
  bila path bentrok dgn README auto-init, pakai operasi `update` atau timpa. Putuskan strategi di 50.4.
- **`update` butuh `sha`**: dual-write `mirror_write` untuk berkas yang sudah ada perlu sha file.
  Untuk awal yang sederhana, deteksi keberadaan (`get_file`) lalu pilih create vs update.
- **Konten biner**: selalu base64 (`make_operations` sudah). Untuk berkas besar → arahkan ke LFS.
- **Username Gitea**: normalisasi dari username PSD (Gitea membatasi karakter); jaga **stabil** agar
  auto-link OIDC konsisten (`sub`).
- **Idempotensi**: `ensure_user` menangani 422 (sudah ada); buat `provision_repo` tahan dipanggil ulang.
- **Token admin**: berkuasa penuh — simpan di pengelola rahasia, jangan di repo.
- **LFS ke MinIO**: pastikan bucket & kredensial Langkah 15; uji unggah berkas >batas.

---

## 9. Referensi terverifikasi

`psd-gitea/app/gitea/` **lulus 6 uji** (create repo, batch ChangeFiles+base64, ensure_user idempoten,
list files, diff mapping, error handling) memakai httpx.MockTransport. Isi seam dengan model repo PSD asli;
deploy Gitea/LFS/OIDC-source adalah ops (bagian 4.1 & 4.3).
