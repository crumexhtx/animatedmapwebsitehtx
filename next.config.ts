import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
  // Collapse www → apex so Google doesn't index duplicate hosts.
  // Pair with Vercel domain settings: apex as primary, www as redirect.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.mapstoit.com' }],
        destination: 'https://mapstoit.com/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
