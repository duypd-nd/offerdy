import type { MetadataRoute } from 'next'

const BASE = 'https://www.offerdy.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // `/g/` la redirect DI THANG ra link affiliate. Link affiliate phai
        // nofollow/sponsored theo huong dan cua Google, nhung redirect phia server
        // khong mang duoc thuoc tinh `rel` (khac <a> trong AffiliateLink.tsx) — nen
        // chan crawler o day thay vi de mot duong affiliate khong kiem soat duoc.
        // `/d/` KHONG chan: no tro ve trang deal cua chinh site.
        disallow: ['/admin/', '/studio/', '/g/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
