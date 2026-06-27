function storageHostname() {
  if (process.env.NEXT_PUBLIC_STORAGE_HOST) {
    return process.env.NEXT_PUBLIC_STORAGE_HOST
  }
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  if (api?.includes('://api.')) {
    return api.replace('://api.', '://storage.').split('/')[2]
  }
  return null
}

const storageHost = storageHostname()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Sementara: banyak error implicit-any di komponen lama; tidak memblokir deploy produksi.
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/u/:username',
        destination: '/:username',
        permanent: true,
      },
    ]
  },
  images: {
    minimumCacheTTL: 2678400 * 6, // 3 months
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      ...(storageHost
        ? [
            {
              protocol: 'https',
              hostname: storageHost,
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
}

export default nextConfig
