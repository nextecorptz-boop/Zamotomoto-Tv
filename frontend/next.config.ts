import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'media-ops-desk.preview.emergentagent.com',
    'media-ops-desk.cluster-5.preview.emergentcf.cloud',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'media-ops-desk.preview.emergentagent.com',
        'media-ops-desk.cluster-5.preview.emergentcf.cloud',
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'trgzfntbzzkxtbyycegw.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'static.prod-images.emergentagent.com' },
      { protocol: 'https', hostname: 'customer-assets.emergentagent.com' },
    ],
  },
  // Disable strict mode to allow Supabase SSR
  reactStrictMode: false,
}

export default nextConfig
