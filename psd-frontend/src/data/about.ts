export type AboutGalleryItem = {
  id: string
  title: string
  description: string
  src: string
}

export const aboutGallery: AboutGalleryItem[] = [
  {
    id: 'brand',
    title: 'Identitas merek PSD',
    description: 'Logo dan merek Projek Sains Data untuk ekosistem sains data lokal.',
    src: '/images/about/merek-logo-psd.jpg',
  },
  {
    id: 'logo',
    title: 'Logo platform',
    description: 'Simbol visual PSD yang dipakai di antarmuka dan materi dokumentasi.',
    src: '/logo-psd-01.png',
  },
  {
    id: 'icon',
    title: 'Ikon aplikasi',
    description: 'Aset ikon untuk favicon, aplikasi mobile, dan identitas digital.',
    src: '/images/about/icon-psd.png',
  },
  {
    id: 'hero',
    title: 'Antarmuka platform',
    description: 'Cuplikan tampilan beranda dan navigasi utama platform.',
    src: '/images/about/platform-hero.png',
  },
  {
    id: 'assets',
    title: 'Eksplorasi aset',
    description: 'Halaman explore untuk dataset, model, dan proyek kolaboratif.',
    src: '/images/about/platform-explore.png',
  },
  {
    id: 'community',
    title: 'Komunitas & kolaborasi',
    description: 'Ruang diskusi, kompetisi, dan event untuk komunitas sains data Indonesia.',
    src: '/images/about/platform-community.png',
  },
]

export type AboutTeamMember = {
  id: string
  name: string
  role: string
  avatar: string
}

export const aboutTeam: AboutTeamMember[] = [
  {
    id: '1',
    name: 'Tim PSD',
    role: 'Pengelola platform',
    avatar: '/images/about/icon-psd.png',
  },
  {
    id: '2',
    name: 'Komunitas ITERA',
    role: 'Kolaborator akademik',
    avatar: '/images/about/merek-logo-psd.jpg',
  },
  {
    id: '3',
    name: 'UMKM Lampung',
    role: 'Mitra lapangan',
    avatar: '/logo-psd-01.png',
  },
  {
    id: '4',
    name: 'Kontributor data',
    role: 'Pemilik dataset & model',
    avatar: '/images/about/platform-explore.png',
  },
  {
    id: '5',
    name: 'Peserta kompetisi',
    role: 'Praktisi sains data',
    avatar: '/images/about/platform-community.png',
  },
  {
    id: '6',
    name: 'Fasilitator belajar',
    role: 'Penyusun materi kursus',
    avatar: '/images/about/platform-hero.png',
  },
]
