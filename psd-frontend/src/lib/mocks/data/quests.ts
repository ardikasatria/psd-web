import type { Quest } from '@/types/api'

export const mockQuestStore: Quest[] = [
  {
    slug: 'mulai-perjalanan',
    title: 'Mulai Perjalanan Sains Data',
    description: 'Quest pembuka yang memandu Anda melalui lingkaran PSD: belajar, buktikan, dan berkontribusi.',
    steps: [
      {
        id: 'profil',
        title: 'Lengkapi profil',
        type: 'complete_profile',
        description: 'Tambahkan foto dan bio agar komunitas mengenal Anda.',
        done: true,
      },
      {
        id: 'belajar',
        title: 'Selesaikan course pertama',
        type: 'complete_course',
        target: 'pengantar-sains-data',
        description: 'Tuntaskan semua pelajaran di Pengantar Sains Data.',
        done: false,
      },
      {
        id: 'buktikan',
        title: 'Submission kompetisi',
        type: 'submit_competition',
        description: 'Kirim submission yang dinilai di kompetisi mana pun.',
        done: false,
      },
      {
        id: 'kontribusi',
        title: 'Terbitkan aset pertama',
        type: 'publish_asset',
        description: 'Buat proyek, dataset, atau model di portofolio Anda.',
        done: false,
      },
    ],
    progress: { done: 1, total: 4 },
    reward_reputation: 30,
    reward_badge: 'langkah-pertama',
    complete: false,
    claimed: false,
    claimable: false,
  },
  {
    slug: 'jalin-komunitas',
    title: 'Jalin Komunitas',
    description: 'Terhubung dengan sesama praktisi sains data di PSD.',
    steps: [
      {
        id: 'follow',
        title: 'Ikuti 3 pengguna',
        type: 'follow_user',
        description: 'Temukan dan ikuti kontributor di Explore.',
        done: true,
      },
      {
        id: 'post',
        title: 'Buat postingan feed',
        type: 'make_post',
        description: 'Bagikan insight atau progres belajar di feed komunitas.',
        done: true,
      },
      {
        id: 'notebook',
        title: 'Buat notebook',
        type: 'create_notebook',
        description: 'Dokumentasikan eksperimen dalam notebook publik.',
        done: true,
      },
    ],
    progress: { done: 3, total: 3 },
    reward_reputation: 20,
    reward_badge: 'terhubung',
    complete: true,
    claimed: false,
    claimable: true,
  },
  {
    slug: 'aktif-di-forum',
    title: 'Aktif di Forum',
    description: 'Berkontribusi di forum diskusi terstruktur PSD.',
    steps: [
      {
        id: 'thread',
        title: 'Buka topik baru',
        type: 'make_thread',
        description: 'Mulai diskusi di forum dengan topik yang jelas.',
        done: false,
      },
      {
        id: 'reply',
        title: 'Balas diskusi',
        type: 'reply_thread',
        description: 'Bantu sesama dengan menjawab atau menanggapi utas.',
        done: false,
      },
    ],
    progress: { done: 0, total: 2 },
    reward_reputation: 15,
    reward_badge: null,
    complete: false,
    claimed: false,
    claimable: false,
  },
]

export const mockJourneyNext = {
  next: {
    title: 'Selesaikan satu course',
    description: 'Mulai dari belajar terstruktur — course pertama membuka pintu ke kompetisi dan portofolio.',
    cta_link: '/learn',
  },
}

export const mockQuestCatalog = mockQuestStore.map((q) => ({
  slug: q.slug,
  title: q.title,
  description: q.description,
  steps_count: q.steps.length,
  reward_reputation: q.reward_reputation,
}))
