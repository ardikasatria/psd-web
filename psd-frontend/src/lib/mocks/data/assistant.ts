let askCount = 0

export function mockAssistantQuota() {
  return {
    tier: 'menengah',
    limit: 20,
    used: Math.min(askCount, 20),
    remaining: Math.max(0, 20 - askCount),
  }
}

export function mockAssistantAsk(question: string, context?: Record<string, string> | null) {
  askCount += 1
  const fitur = context?.fitur ?? 'platform PSD'
  const reply =
    `[Mock] Pertanyaan Anda tentang "${question.slice(0, 80)}" ` +
    `(konteks: ${fitur}) — buka dokumentasi di /help atau jelajahi fitur terkait di navigasi.`
  return { reply, quota: mockAssistantQuota() }
}

export function mockPersonalizedFeed() {
  return {
    strategy: 'affinity' as const,
    feed: [
      {
        type: 'next_steps' as const,
        title: 'Langkah berikutnya',
        items: [
          { action: 'publish_dataset', text: 'Publikasikan dataset pertama Anda', href: '/datasets/new' },
          { action: 'join_competition', text: 'Ikuti kompetisi aktif', href: '/competitions' },
        ],
      },
      {
        type: 'recommendation' as const,
        kind: 'dataset',
        title: 'Dataset untuk Anda',
        items: [
          {
            id: 'ds_mock_1',
            slug: 'demo/penjualan-umkm',
            title: 'Penjualan UMKM Demo',
            href: '/datasets/demo/penjualan-umkm',
            tags: ['bisnis', 'csv'],
          },
        ],
      },
      {
        type: 'recommendation' as const,
        kind: 'course',
        title: 'Course untuk Anda',
        items: [
          {
            id: 'c_mock_1',
            slug: 'python-dasar',
            title: 'Python untuk Analisis Data',
            href: '/learn/python-dasar',
            tags: ['python', 'pemula'],
          },
        ],
      },
    ],
  }
}

export function resetMockAssistantQuota() {
  askCount = 0
}
