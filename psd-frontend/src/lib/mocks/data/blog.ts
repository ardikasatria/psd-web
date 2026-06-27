import type { BlogDetail, BlogSummary } from '@/types/api'

export const mockBlogPosts: BlogDetail[] = [
  {
    slug: 'psd-luncurkan-platform-v2',
    title: 'PSD meluncurkan platform kolaboratif versi 2',
    summary:
      'Projek Sains Data menghadirkan pengalaman baru untuk berbagi dataset, model, dan kompetisi berkonteks Indonesia.',
    cover_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    tags: ['platform', 'umkm'],
    author: { username: 'psd', type: 'org', avatar_url: null, is_official: true },
    published_at: '2026-06-20T08:00:00Z',
    status: 'published',
    body_md: `<p>Projek Sains Data (PSD) resmi meluncurkan versi terbaru platform kolaboratif sains data untuk Indonesia. Pembaruan ini memusatkan pengalaman pengguna, integrasi komunitas, dan jalur belajar yang lebih terstruktur.</p>
<h2>Apa yang baru?</h2>
<ul>
<li>Profil pengguna dan organisasi yang lebih kaya</li>
<li>Feed komunitas terpisah dari forum diskusi</li>
<li>Sistem reputasi dan badge kontributor</li>
</ul>
<p>Kami mengundang praktisi data, peneliti, dan pelaku UMKM untuk bergabung dan berkontribusi.</p>`,
  },
  {
    slug: 'panduan-dataset-umkm-lampung',
    title: 'Panduan memanfaatkan dataset UMKM Lampung',
    summary: 'Tips praktis mengolah data transaksi dan profil UMKM untuk analitik bisnis lokal.',
    cover_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=630&fit=crop',
    tags: ['dataset', 'umkm', 'lampung'],
    author: { username: 'admin-psd', type: 'user', avatar_url: null, is_official: false },
    published_at: '2026-06-15T10:30:00Z',
    status: 'published',
    body_md: `<p>Dataset UMKM Lampung menyediakan profil usaha, kategori, dan indikator kinerja dasar. Artikel ini merangkum langkah awal eksplorasi data untuk pemilik usaha dan analis.</p>
<h2>Mulai dari profil usaha</h2>
<p>Pertama, pahami struktur kolom dan kualitas data. Bersihkan nilai kosong sebelum membuat agregasi.</p>
<blockquote>Data lokal memberi konteks yang tidak selalu tersedia di dataset global.</blockquote>`,
  },
  {
    slug: 'draft-nlp-indonesia-2026',
    title: 'Roadmap riset NLP Indonesia 2026',
    summary: 'Draf internal tentang prioritas riset bahasa Indonesia di PSD.',
    cover_url: null,
    tags: ['nlp', 'riset'],
    author: { username: 'admin-psd', type: 'user', avatar_url: null, is_official: false },
    published_at: null,
    status: 'draft',
    body_md: '<p>Draf artikel — hanya terlihat oleh staf.</p>',
  },
]

export function listMockBlog(params: { tag?: string; status?: string } = {}): BlogSummary[] {
  let items = [...mockBlogPosts]
  if (params.status === 'draft') {
    items = items.filter((p) => p.status === 'draft')
  } else if (params.status !== 'all') {
    items = items.filter((p) => p.status === 'published')
  }
  if (params.tag) {
    items = items.filter((p) => p.tags.includes(params.tag!))
  }
  return items.sort((a, b) => {
    const da = a.published_at ?? ''
    const db = b.published_at ?? ''
    return db.localeCompare(da)
  })
}

export function getMockArticle(slug: string) {
  return mockBlogPosts.find((p) => p.slug === slug) ?? null
}
