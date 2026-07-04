import type { MetadataRoute } from 'next'

const BASE = 'https://www.offerdy.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/studio/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
