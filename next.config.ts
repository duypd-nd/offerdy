import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    // Toi uu anh chay tren CDN cua Sanity, khong qua /_next/image — xem
    // src/lib/imageLoader.ts de biet ly do (han muc anh cua Vercel).
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    // remotePatterns chi con tac dung neu quay lai bo toi uu cua Next.
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      // Admin co the dan link anh ngoai (externalImageUrl / dealUrl) tu bat ky domain nao
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      // Mac dinh 1MB qua nho cho anh upload tu may (Post/Deal image) -> nang len 10MB
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'offerdy',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
})
