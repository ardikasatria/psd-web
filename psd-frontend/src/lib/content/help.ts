export type HelpArticle = {
  slug: string
  title: string
  description: string
  content: string
}

export const helpArticles: HelpArticle[] = [
  {
    slug: 'apa-itu-psd',
    title: 'Apa itu PSD?',
    description: 'Penjelasan singkat Projek Sains Data dan nilainya bagi Indonesia.',
    content: `# Apa itu Projek Sains Data?

Projek Sains Data (PSD) adalah platform kolaboratif untuk menemukan, membagikan, dan mengembangkan aset sains data berkonteks Indonesia.

## Nilai utama

- **Dataset lokal** — data UMKM, pertanian, dan pemerintah yang relevan.
- **Model siap pakai** — contoh implementasi untuk bahasa Indonesia.
- **Kompetisi & komunitas** — belajar sambil berkontribusi pada masalah nyata.

PSD dikurasi oleh tim resmi dan komunitas praktisi di seluruh nusantara.`,
  },
  {
    slug: 'panduan-memulai',
    title: 'Panduan memulai',
    description: 'Langkah pertama bagi pendatang baru di PSD.',
    content: `# Panduan memulai

1. **Buat akun** dan lengkapi profil Anda.
2. **Jelajahi Explore** untuk menemukan dataset dan model.
3. **Ikuti kompetisi aktif** atau daftar event komunitas.
4. **Buat proyek pertama** dari menu Dashboard → Buat proyek.
5. **Gabung forum** untuk bertanya dan berbagi pengalaman.

Butuh panduan lebih detail? Lihat [FAQ](/help/faq) dan [Pedoman komunitas](/help/pedoman-komunitas).`,
  },
  {
    slug: 'faq',
    title: 'FAQ',
    description: 'Pertanyaan yang sering diajukan.',
    content: `# Pertanyaan umum

## Apakah PSD gratis?

Ya, fase pilot saat ini gratis untuk eksplorasi dan kontribusi terbuka.

## Bagaimana cara mengunggah dataset?

Buka **Dataset → Buat baru**, isi metadata, lalu unggah file melalui panel file di halaman aset.

## Siapa yang bisa menandai aset sebagai pilihan?

Hanya admin PSD yang menandai konten **Pilihan** agar muncul di beranda.

## Bagaimana verifikasi email?

Buka **Pengaturan → Keamanan** dan ikuti tautan verifikasi yang dikirim ke email Anda.`,
  },
  {
    slug: 'pedoman-komunitas',
    title: 'Pedoman komunitas',
    description: 'Aturan dan etika berinteraksi di PSD.',
    content: `# Pedoman komunitas

- Hormati sesama anggota; hindari pelecehan dan spam.
- Sertakan **lisensi** yang jelas pada setiap aset yang dibagikan.
- Jangan unggah data pribadi atau rahasia tanpa izin.
- Berikan konteks dan dokumentasi yang memadai pada dataset dan model.
- Laporkan konten yang melanggar kepada tim PSD melalui forum atau email resmi.

Bersama kita bangun ekosistem sains data yang inklusif dan bertanggung jawab.`,
  },
]

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((a) => a.slug === slug)
}
