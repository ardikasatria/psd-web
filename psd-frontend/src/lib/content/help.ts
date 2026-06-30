export type HelpCategory = 'mulai' | 'git' | 'notebook' | 'komunitas'

export type HelpArticle = {
  slug: string
  title: string
  description: string
  category: HelpCategory
  content: string
  downloadHref?: string
  downloadLabel?: string
}

export const helpCategories: { id: HelpCategory; label: string; description: string }[] = [
  { id: 'mulai', label: 'Mulai', description: 'Orientasi platform & langkah pertama' },
  { id: 'git', label: 'Git & repo', description: 'Clone, push, LFS, dan Pull Request' },
  { id: 'notebook', label: 'Notebook', description: 'Jupyter Notebook & SDK psd://' },
  { id: 'komunitas', label: 'Komunitas', description: 'Etika, FAQ, dan pedoman' },
]

export const helpArticles: HelpArticle[] = [
  {
    slug: 'apa-itu-psd',
    category: 'mulai',
    title: 'Apa itu PSD?',
    description: 'Penjelasan singkat Projek Sains Data dan nilainya bagi Indonesia.',
    content: `# Apa itu Projek Sains Data?

Projek Sains Data (PSD) adalah platform kolaboratif untuk menemukan, membagikan, dan mengembangkan aset sains data berkonteks Indonesia.

## Nilai utama

- **Dataset lokal** — data UMKM, pertanian, dan pemerintah yang relevan.
- **Model siap pakai** — contoh implementasi untuk bahasa Indonesia.
- **Kompetisi & komunitas** — belajar sambil berkontribusi pada masalah nyata.
- **Feed & forum** — berbagi progres, diskusi, dan kolaborasi terbuka.
- **Pabrik Data & analitik** — pipeline, dashboard, dan ruang ide kolaboratif.
- **Git & notebook** — versioning nyata (Gitea) dan Jupyter Notebook terintegrasi login PSD.
- **Bantuan & pengaduan** — laporkan masalah platform lewat tiket di [/support](/support).

PSD dikurasi oleh tim resmi dan komunitas praktisi di seluruh nusantara.

## Siapa yang cocok memakai PSD?

- Mahasiswa dan pelajar sains data
- Praktisi UMKM yang ingin analisis data praktis
- Kontributor open data dan model ML lokal
- Instruktur yang menjalankan kelas atau kompetisi

Lanjut ke [Panduan memulai](/help/panduan-memulai) untuk langkah praktis pertama.`,
  },
  {
    slug: 'panduan-memulai',
    category: 'mulai',
    title: 'Panduan memulai',
    description: 'Langkah demi langkah dari daftar akun hingga kontribusi pertama.',
    content: `# Panduan memulai

Ikuti urutan ini agar pengalaman pertama Anda di PSD lancar.

## 1. Buat akun & verifikasi email

1. Buka halaman **Daftar**, isi nama, username, email, dan kata sandi.
2. Setujui Ketentuan Layanan & Kebijakan Privasi.
3. Cek email — klik tombol **Verifikasi email** (berlaku ±60 menit).
4. Bila belum menerima email, buka [Pengaturan → Keamanan](/settings/security) → *Kirim ulang email verifikasi*.

> **Catatan:** Verifikasi email diperlukan agar notifikasi dan fitur keamanan akun berjalan dengan benar.

## 2. Lengkapi profil & onboarding

- Unggah avatar dan bio singkat di [Pengaturan profil](/settings/profile).
- Selesaikan checklist onboarding di [Dasbor](/dashboard) — ikuti event, gabung forum, atau buat proyek pertama.

## 3. Jelajahi konten

- **Dataset** — [/datasets](/datasets) temukan & unduh data
- **Model ML** — [/ml](/ml) registry model
- **Kompetisi** — [/competitions](/competitions) latihan & lomba
- **Belajar** — [/learn](/learn) kursus & materi
- **Feed** — [/feed](/feed) postingan komunitas
- **Forum** — [/forum](/forum) diskusi bertopik

## 4. Buat atau ikuti proyek

- **Proyek / repo:** [Dashboard → Buat proyek](/projects) atau buka repo dari halaman aset.
- **Ruang ide:** kolaborasi tim dengan notebook & solusi — lihat [/rooms](/rooms).
- **Pabrik Data:** pipeline visual di [/factory/pipelines](/factory/pipelines).

## 5. Git & notebook (Fase lanjut)

Setelah repo aktif di Git (Gitea):

- Baca [Menyiapkan akses Git](/help/git-menyiapkan-akses) sebelum \`git push\` dari laptop.
- Baca [Membuka notebook](/help/notebook-membuka) untuk Jupyter Notebook & SDK \`psd://\`.

## 6. Atur notifikasi

Di [Pengaturan → Notifikasi](/settings/notifications) pilih email (segera / ringkasan harian) dan notifikasi in-app.

## Butuh bantuan cepat?

- [FAQ](/help/faq) — pertanyaan umum
- [Pedoman komunitas](/help/pedoman-komunitas) — etika berinteraksi
- [Bantuan & pengaduan](/support) — tiket masalah platform
- Forum — tanya praktisi lain di [/forum](/forum)`,
  },
  {
    slug: 'git-menyiapkan-akses',
    category: 'git',
    title: 'Menyiapkan akses Git',
    description: 'SSH key atau token untuk push ke repository Gitea PSD.',
    content: `# Menyiapkan akses Git

Anda masuk ke PSD (dan Git PSD) dengan **satu akun** lewat login PSD. Untuk **mendorong (push)** kode dari komputer, siapkan autentikasi Git — bukan kata sandi login web.

> **Catatan:** Login PSD memakai OAuth/OIDC. Akun Git PSD Anda **tidak punya kata sandi biasa** untuk push — gunakan SSH key atau Personal Access Token (PAT).

## Opsi A — SSH key (disarankan)

1. Buat kunci (sekali saja di laptop):

\`\`\`bash
ssh-keygen -t ed25519 -C "email-anda@domain.ac.id"
\`\`\`

2. Salin kunci **publik**:

\`\`\`bash
cat ~/.ssh/id_ed25519.pub
\`\`\`

3. Buka [Pengaturan → Git & SSH](/settings/git) di PSD — tempel isi kunci publik.

4. Uji koneksi — salin perintah dari halaman Pengaturan, atau gunakan format standar:

\`\`\`bash
ssh -T git@git.projeksainsdata.com
\`\`\`

Respon sukses menampilkan sapaan dengan username Git Anda. Jika gagal, pastikan kunci publik sudah terdaftar dan Anda memakai host yang sama dengan contoh clone di halaman repo.

> **Tip:** URL clone SSH mengikuti pola \`git@host:pemilik/nama-repo.git\` — sama seperti GitHub. Salin URL **persis** dari banner clone repo atau Pengaturan → Git & SSH.

## Opsi B — Personal Access Token (HTTPS)

1. Di Git PSD: **Pengaturan → Aplikasi → Generate New Token** — beri nama, centang scope **repo**.
2. **Salin token** (hanya muncul sekali).
3. Saat \`git push\` via HTTPS meminta kredensial:
   - **Username** = username Gitea/PSD Anda
   - **Password** = token (bukan kata sandi login web)

## Identitas commit Git

Atur sekali di laptop:

\`\`\`bash
git config --global user.name "Nama Anda"
git config --global user.email "email-anda@domain.ac.id"
\`\`\`

Email sebaiknya sama dengan akun PSD agar kontribusi terlacak.

Lanjut: [Clone, commit & push](/help/git-clone-push) · [LFS & Pull Request](/help/git-lfs-kontribusi)`,
  },
  {
    slug: 'git-clone-push',
    category: 'git',
    title: 'Clone, commit & push',
    description: 'Alur dasar Git dari URL clone di halaman repo PSD.',
    content: `# Clone, commit & push

## Dapatkan URL clone

1. Buka halaman **repo** di PSD (dataset, model, atau proyek).
2. Lihat banner **Clone** — salin URL **HTTPS** atau **SSH**.
3. URL mengikuti pola \`git.<domain>/<pemilik>/<nama-repo>.git\`.

## Clone ke laptop

Salin URL **SSH** dari banner clone repo atau dari [Pengaturan → Git & SSH](/settings/git).

\`\`\`bash
# SSH (format standar — ganti dengan URL persis dari UI Anda)
git clone git@git.projeksainsdata.com:username/nama-repo.git

# HTTPS (pakai token sebagai password)
git clone https://git.projeksainsdata.com/username/nama-repo.git
\`\`\`

> **Tip:** Ganti \`username/nama-repo\` dengan path **persis** dari banner clone repo Anda.

## Commit & push

\`\`\`bash
cd nama-repo
# ... edit berkas ...
git status
git add .
git commit -m "Deskripsi perubahan singkat"
git push origin main
\`\`\`

Branch default biasanya \`main\`. Jika repo memakai branch lain, ganti \`main\` sesuai petunjuk di UI.

## Kesalahan umum

- **Permission denied (SSH):** SSH key belum ditambahkan di Git PSD — lihat [Menyiapkan akses Git](/help/git-menyiapkan-akses).
- **Authentication failed (HTTPS):** gunakan **token** sebagai password, bukan password login web.
- **Push rejected:** repo mungkin hanya menerima kontribusi via **Pull Request** — lihat [LFS & Pull Request](/help/git-lfs-kontribusi).

Belum punya akses Git? Pastikan kunci SSH sudah ditambahkan di [Pengaturan → Git & SSH](/settings/git).`,
  },
  {
    slug: 'git-lfs-kontribusi',
    category: 'git',
    title: 'Git LFS & Pull Request',
    description: 'Berkas besar, fork, branch, dan review kontribusi.',
    content: `# Git LFS & Pull Request

## Berkas besar — Git LFS

Untuk model atau data besar, gunakan **Git LFS** agar repo tetap ringan:

\`\`\`bash
git lfs install
git lfs track "*.parquet" "*.csv" "*.bin" "*.pkl"
git add .gitattributes
git add data/besar.parquet
git commit -m "Tambah data via LFS"
git push
\`\`\`

> **Tip:** Lebih baik akses dataset lewat \`psd://\` dari notebook daripada menyimpan data mentah besar di repo Git. Lihat [Mengakses dataset psd://](/help/notebook-dataset-sdk).

## Berkontribusi ke repo orang lain

Alur kolaborasi ala GitHub/Hugging Face:

1. **Fork** repo dari halaman repo PSD (tab **Kontribusi**).
2. Clone **fork Anda**, buat branch fitur:

\`\`\`bash
# Salin URL SSH persis dari banner clone / Pengaturan → Git & SSH
git clone git@git.projeksainsdata.com:username/fork-repo.git
cd fork-repo
git checkout -b fitur-baru
# ... ubah, commit ...
git push origin fitur-baru
\`\`\`

3. Buka **Pull Request** ke repo asal lewat UI PSD.
4. Reviewer memberi komentar atau approve; setelah merge Anda menerima **notifikasi** (in-app & email bila diaktifkan).

## Praktik baik

- Commit message jelas (Bahasa Indonesia atau Inggris konsisten).
- Jangan commit rahasia (.env, API key, data pribadi).
- Sertakan README atau catatan perubahan pada PR besar.`,
  },
  {
    slug: 'notebook-membuka',
    category: 'notebook',
    title: 'Membuka notebook',
    description: 'Workspace terintegrasi PSD, runtime hybrid, dan kuota tier.',
    content: `# Membuka notebook

## Notebook terintegrasi (bukan Colab)

PSD menyediakan **notebook langsung di platform** — pengalaman mirip Kaggle. Anda **tidak perlu** membuka panel Jupyter terpisah atau mengatur server sendiri.

1. Buka **Notebook** → **Mulai notebook** (workspace).
2. **Tier pemula** — runtime **browser** (JupyterLite + Pyodide), tanpa menunggu server.
3. **Tier menengah/lanjut** — dapat memakai **kernel server** terisolasi; login PSD otomatis mengurus autentikasi.

## Kuota per tier

| Tier | Notebook | Kernel aktif | Runtime |
|------|----------|--------------|---------|
| Pemula | 3 | 1 | Browser saja |
| Menengah | 10 | 2 | Browser + server |
| Lanjut | 50 | 4 | Browser + server |

Tier naik seiring **poin gamifikasi**. Runtime saat ini **CPU-only** (tanpa GPU).

## Kernel server (tier menengah+)

Tombol **Buka kernel server** menyiapkan lingkungan kerja pribadi Anda. Folder kerja tersimpan di workspace notebook; sesi idle otomatis dihentikan setelah periode tidak aktif (~1 jam).

Bila akses kernel server belum tersedia di tier Anda, ajukan permohonan lewat formulir di halaman notebook — tim PSD meninjau permohonan tersebut.

## Fitur terkait

- **SDK psd://** — muat dataset langsung dari platform tanpa mengunduh manual ke repo Git.
- **Simpan & push** — commit notebook ke Git dari terminal workspace.
- **Asisten PSD** — bantuan kontekstual saat Anda bekerja di berbagai halaman.

Lanjut: [Dataset psd://](/help/notebook-dataset-sdk) · [Simpan & push notebook](/help/notebook-simpan-push)`,
  },
  {
    slug: 'notebook-dataset-sdk',
    category: 'notebook',
    title: 'Mengakses dataset (psd://)',
    description: 'SDK psd.load dan psd.download di Jupyter Notebook.',
    content: `# Mengakses dataset dengan psd://

Image notebook PSD sudah memuat library **psd**. Kredensial API diinjeksikan otomatis saat kernel berjalan — **jangan** hard-code secret di notebook.

## Format URI

\`\`\`
psd://<pemilik>/<dataset>/<path/berkas>
\`\`\`

Contoh: \`psd://contoh/iris/iris.csv\`

## Muat sebagai DataFrame

\`\`\`python
import psd

df = psd.load("psd://pemilik/dataset/berkas.csv")
df.head()
\`\`\`

Mendukung CSV, Parquet, JSON (tergantung berkas sumber).

## Unduh berkas lokal

\`\`\`python
path = psd.download("psd://pemilik/dataset/berkas.csv")
print("Tersimpan di:", path)
\`\`\`

Akses lewat **presigned URL** berumur pendek — kredensial penyimpanan tidak disimpan permanen di notebook.

> **Tip:** Untuk data besar, prefer \`psd.load\` / streaming daripada menyalin seluruh bucket ke repo Git.

## Notebook contoh

Unduh notebook **Mulai Cepat PSD** yang sudah berisi contoh di atas:

[Unduh mulai-cepat-psd.ipynb](/docs/mulai-cepat-psd.ipynb)

Unggah ke Jupyter Notebook (\`~/work\`) atau buka langsung setelah unduh.`,
  },
  {
    slug: 'notebook-simpan-push',
    category: 'notebook',
    title: 'Menyimpan & push notebook',
    description: 'Commit .ipynb ke Git dari Jupyter Notebook.',
    content: `# Menyimpan & mendorong notebook ke Git

## Bersihkan output sebelum commit

Output notebook (grafik, log) membuat diff Git besar dan sulit direview.

1. Di Jupyter: **Kernel → Restart Kernel and Clear Outputs**
2. Simpan notebook (**Ctrl+S** / Cmd+S)

## Push via terminal Jupyter Notebook

1. **File → New → Terminal**
2. Clone repo (jika belum) — gunakan URL dari banner clone PSD:

\`\`\`bash
git clone git@git.projeksainsdata.com:username/nama-repo.git ~/work/proyek-saya
cd ~/work/proyek-saya
\`\`\`

3. Salin notebook ke folder repo, lalu commit:

\`\`\`bash
cp ~/work/analisis.ipynb .
git add analisis.ipynb
git commit -m "Tambah analisis eksplorasi"
git push origin main
\`\`\`

Pastikan **SSH key atau token** sudah disiapkan — lihat [Menyiapkan akses Git](/help/git-menyiapkan-akses).

## .gitignore yang disarankan

\`\`\`gitignore
.ipynb_checkpoints/
__pycache__/
*.tmp
data/raw/
.env
\`\`\`

> **Peringatan:** Jangan commit data mentah besar — akses via \`psd://\` atau Git LFS. Lihat [Git LFS & PR](/help/git-lfs-kontribusi).`,
  },
  {
    slug: 'faq',
    category: 'komunitas',
    title: 'FAQ',
    description: 'Pertanyaan yang sering diajukan.',
    content: `# Pertanyaan umum

## Apakah PSD gratis?

Ya, fase pilot saat ini gratis untuk eksplorasi dan kontribusi terbuka.

## Bagaimana cara mengunggah dataset?

Buka **Dataset → Buat baru**, isi metadata, lalu unggah file melalui panel file di halaman aset. Repo Git otomatis dibuat bila integrasi Gitea aktif.

## Bagaimana verifikasi email?

1. Setelah daftar, cek inbox (dan folder spam) untuk email verifikasi.
2. Klik tombol di email atau buka [Pengaturan → Keamanan](/settings/security) → *Kirim ulang email verifikasi*.
3. Tautan berlaku ±60 menit.

## Lupa kata sandi?

Gunakan [Lupa kata sandi](/forgot-password). Email reset berlaku ±30 menit. Respons selalu sukses meski email tidak terdaftar (keamanan).

## Mengapa git push ditolak?

- Belum pasang SSH key / token — lihat [Menyiapkan akses Git](/help/git-menyiapkan-akses).
- Push langsung ke repo orang lain — gunakan **fork → Pull Request**.
- Branch protected — buat branch baru, jangan push ke \`main\` langsung.

## Notebook tidak bisa dibuka?

- Tunggu 1–2 menit bila kernel server sedang disiapkan.
- Tier atau kuota kernel penuh — tutup sesi lama atau gunakan runtime browser.
- Ajukan akses kernel server jika tombol belum tersedia di tier Anda.

## Bagaimana melaporkan konten atau masalah platform?

- **Konten feed/forum** — menu **⋯ → Laporkan** pada postingan, komentar, atau balasan.
- **Masalah teknis / akun** — buat tiket di [Bantuan & pengaduan](/support).

## Siapa yang bisa menandai aset pilihan?

Hanya **staf/moderator** PSD yang menandai konten **Pilihan** di beranda.

## Bagaimana notifikasi email?

Atur di [Pengaturan → Notifikasi](/settings/notifications): email segera, ringkasan harian, atau mati per kategori.`,
  },
  {
    slug: 'pedoman-komunitas',
    category: 'komunitas',
    title: 'Pedoman komunitas',
    description: 'Aturan dan etika berinteraksi di PSD.',
    content: `# Pedoman komunitas

- Hormati sesama anggota; hindari pelecehan, spam, dan ujaran kebencian.
- Sertakan **lisensi** yang jelas pada setiap aset yang dibagikan.
- Jangan unggah data pribadi atau rahasia tanpa izin (PII, NIK, rekening, dll.).
- Berikan konteks dan dokumentasi yang memadai pada dataset dan model.
- Jangan commit kredensial (API key, password) ke repo Git — gunakan variabel lingkungan.
- Laporkan konten yang melanggar lewat menu **Laporkan** di feed/forum, atau buat pengaduan di [/support](/support).
- Pull Request: berikan deskripsi jelas; respon review dengan sopan.

Bersama kita bangun ekosistem sains data yang inklusif dan bertanggung jawab.

Lihat juga [Ketentuan Layanan](/legal/ketentuan-layanan) dan [Kebijakan Privasi](/legal/kebijakan-privasi).`,
  },
]

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.slug === slug)
}

export function getHelpArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return helpArticles.filter((a) => a.category === category)
}
