import type { MetadataRoute } from 'next'
import { getSiteBase } from '@/sanity/queries'


export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteBase()
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
    sitemap: `${base}/sitemap.xml`,
  }
}
