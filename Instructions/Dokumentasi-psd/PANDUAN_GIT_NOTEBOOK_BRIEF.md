# Brief Agen Cursor — Dokumentasi Web: Git Push & Notebook (.ipynb)

> **Cara pakai:** lampirkan ke agen Cursor di repo PSD, mulai dengan:
> *"Bangun halaman dokumentasi web dari brief ini. Mulai dari **Langkah 0 — Orientasi repo**,
> laporкан temuan & SESUAIKAN nilai konkret (host SSH, format clone URL, jalur generate token,
> entry 'Buka Notebook') ke konfigurasi PSD asli SEBELUM menulis."*
>
> Ini **brief dokumentasi**, bukan implementasi fitur. Konten panduan (Bahasa Indonesia) sudah
> ditulis di §4 & §5 — tugas agen: **render jadi halaman docs web** + sesuaikan detail nyata.

---

## 1. Tujuan

Buat dua halaman dokumentasi web untuk pengguna PSD:
1. **Git push untuk pengguna** — cara autentikasi & mendorong kode ke repo (Gitea, Langkah 50/51).
2. **Notebook (.ipynb) di PSD** — cara memakai JupyterHub + SDK `psd://` (Langkah 52).

Sediakan juga **notebook contoh** (`mulai-cepat-psd.ipynb`) yang bisa diunduh dari halaman docs.

---

## 2. Langkah 0 — Orientasi repo (WAJIB, sesuaikan nilai konkret)

Dokumentasi HARUS akurat ke konfigurasi PSD asli. Temukan & sesuaikan placeholder:

- [ ] **Domain Gitea** & format **clone URL** (HTTPS & SSH). Placeholder dipakai:
      `https://git.psd.example/<owner>/<repo>.git` dan `git@git.psd.example:<owner>/<repo>.git`.
      Cek **port SSH** Gitea (22 atau kustom mis. 2222) & host.
- [ ] **Kebijakan auth push**: SSH key dan/atau Personal Access Token (PAT). Karena pengguna login
      via OIDC (tanpa password Gitea), push pakai **SSH key** atau **PAT sebagai password**.
- [ ] Jalur UI Gitea untuk **menambah SSH key** & **membuat token** (Settings → SSH/GPG Keys / Applications).
- [ ] Cara PSD menampilkan **clone URL** repo di UI (dari `clone_url` Langkah 50).
- [ ] Entry **"Buka Notebook"** di PSD (dari Ruang Ide/halaman repo) & URL JupyterHub.
- [ ] **Batas tier** notebook nyata (CPU/RAM/idle) dari `tiers.py` (Langkah 52) untuk dicantumkan.
- [ ] **API SDK `psd`** yang nyata (`psd.load`, `psd.download`, format URI) — samakan dengan Langkah 52.
- [ ] Kerangka docs yang dipakai (Next.js route `/docs`, MDX, Nextra, Docusaurus?) → §6.

**Pertanyaan untuk manусia:**
1. Push diizinkan via SSH, PAT, atau keduanya? Default yang disarankan?
2. Port & host SSH Gitea final?
3. Apakah kontributor internal boleh push langsung, atau selalu fork→PR (Langkah 51)?

---

## 3. Struktur informasi (sidebar docs)

```
Dokumentasi
├─ Mulai
│  └─ Ringkasan
├─ Git
│  ├─ Menyiapkan akses (SSH key / token)
│  ├─ Clone, commit, push
│  ├─ Berkas besar (Git LFS)
│  └─ Berkontribusi (fork → branch → Pull Request)
└─ Notebook
   ├─ Membuka notebook
   ├─ Batas sumber daya & penyimpanan
   ├─ Mengakses dataset (psd://)
   ├─ Menyimpan & push notebook ke Git
   └─ Notebook contoh (unduh)
```

---

## 4. KONTEN — Git push untuk pengguna (render apa adanya, sesuaikan placeholder)

### 4.1 Menyiapkan akses

Anda masuk ke PSD (dan Gitea) lewat satu akun. Untuk **mendorong (push)** dari komputer Anda,
pilih salah satu metode autentikasi:

**A. SSH key (disarankan)**
1. Buat kunci (sekali saja):
   ```bash
   ssh-keygen -t ed25519 -C "email-anda@itera.ac.id"
   ```
2. Salin kunci publik:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Di PSD/Gitea: **Pengaturan → SSH Keys → Tambah Kunci**, tempel isi di atas.
4. Uji:
   ```bash
   ssh -T git@git.psd.example
   ```

**B. Personal Access Token (HTTPS)**
1. Di Gitea: **Pengaturan → Aplikasi → Buat Token** (beri nama, pilih scope `repo`).
2. Salin token (**hanya muncul sekali**).
3. Saat `git push` HTTPS meminta kredensial: **username = nama pengguna Gitea Anda**,
   **password = token** (bukan kata sandi).

> Login PSD memakai OIDC, sehingga akun Gitea Anda tidak punya kata sandi biasa untuk push —
> gunakan SSH key atau token di atas.

### 4.2 Clone, commit, push

Ambil **URL clone** repo dari halaman repo di PSD.

```bash
# SSH
git clone git@git.psd.example:budi/proyek-saya.git
# atau HTTPS
git clone https://git.psd.example/budi/proyek-saya.git

cd proyek-saya
# ... ubah berkas ...
git add .
git commit -m "Deskripsi perubahan"
git push origin main
```

Atur identitas commit (sekali):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-anda@itera.ac.id"
```

### 4.3 Berkas besar (Git LFS)

Untuk berkas besar (model, data), gunakan **Git LFS** agar repo tetap ringan:
```bash
git lfs install
git lfs track "*.parquet" "*.csv" "*.bin"
git add .gitattributes
git add data/besar.parquet
git commit -m "Tambah data via LFS"
git push
```
> Lebih baik lagi: akses dataset lewat `psd://` dari notebook daripada menyimpan data mentah besar di repo.

### 4.4 Berkontribusi ke repo orang lain (fork → PR)

1. **Fork** repo dari PSD (tombol *Fork*/*Ajukan Kontribusi*).
2. Clone fork Anda, buat **branch**:
   ```bash
   git checkout -b fitur-baru
   # ubah, commit
   git push origin fitur-baru
   ```
3. Buka **Pull Request** ke repo asal lewat PSD.
4. Reviewer memberi komentar/approve; setelah disetujui, PR di-merge. Anda akan menerima notifikasi.

---

## 5. KONTEN — Notebook (.ipynb) di PSD (render apa adanya, sesuaikan placeholder)

### 5.1 Membuka notebook

Dari halaman repo/Ruang Ide, klik **"Buka Notebook"**. Anda langsung masuk (login PSD), dan
server notebook pribadi disiapkan. Tidak perlu instalasi di komputer Anda.

### 5.2 Batas sumber daya & penyimpanan

- **CPU-only** (tanpa GPU). CPU/RAM mengikuti **tier** Anda — naikkan tier dengan poin gamifikasi.
- Server **berhenti otomatis** setelah idle (hemat sumber daya); kerja Anda tetap tersimpan.
- Folder kerja **`~/work`** bersifat persisten antar-sesi.
- *(Sesuaikan angka tier nyata dari konfigurasi PSD.)*

### 5.3 Mengakses dataset dengan `psd://`

SDK `psd` sudah terpasang; kredensial diinjeksikan otomatis.
```python
import psd

# Muat jadi DataFrame (csv/parquet/json)
df = psd.load("psd://pemilik/dataset/berkas.csv")
df.head()

# Atau unduh berkasnya
path = psd.download("psd://pemilik/dataset/berkas.csv")
```
Format URI: `psd://<pemilik>/<dataset>/<path/berkas>`. Akses lewat presigned URL berumur pendek —
tidak ada kredensial penyimpanan yang disimpan di notebook.

### 5.4 Menyimpan & mendorong notebook ke Git

1. **Bersihkan output** sebelum commit (*Kernel → Restart & Clear Output*) agar diff bersih.
2. Buka terminal (*File → New → Terminal*) di JupyterHub, lalu:
   ```bash
   cd ~/work/proyek-saya
   git add analisis.ipynb
   git commit -m "Tambah analisis"
   git push
   ```
3. Siapkan akses git (SSH/token) sesuai dokumentasi **Git**.

> Tambahkan `.gitignore` untuk berkas sementara & data lokal. Jangan commit data mentah besar —
> akses via `psd://`.

### 5.5 Notebook contoh

Sediakan tautan unduh **`mulai-cepat-psd.ipynb`** (disertakan) — berisi contoh `psd.load`,
`psd.download`, dan alur push.

---

## 6. Instruksi render (untuk agen)

- Render §4 & §5 sebagai halaman docs di kerangka yang dipakai PSD (MDX/Next.js/Nextra/Docusaurus).
  Lihat **template contoh** `psd-docs/template/git-push.mdx`.
- **Ganti SEMUA placeholder** (`git.psd.example`, owner contoh, port SSH, angka tier) dengan nilai nyata
  (hasil Langkah 0).
- Blok kode pakai komponen **salin (copy)**.
- Pakai **callout** untuk catatan penting (login OIDC tanpa password, idle-culling, LFS).
- Sediakan **tombol unduh** notebook contoh (`mulai-cepat-psd.ipynb`).
- Bila ada SDK reference, tautkan ke halaman API SDK (`psd.load/download`).

---

## 7. Pemeliharaan (penting)

Dokumentasi ini menyalin detail konfigurasi (host, port, batas tier, API SDK). **Saat konfigurasi
berubah** (mis. port SSH, angka tier, format URI), **perbarui docs**. Pertimbangkan menaut nilai dari
satu sumber (env/konstanta) agar tidak mudah basi.

---

## 8. Berkas pendukung

- `psd-docs/notebook-contoh/mulai-cepat-psd.ipynb` — notebook contoh **tervalidasi** (nbformat 4).
- `psd-docs/template/git-push.mdx` — template MDX contoh (format render, copy, callout).
