import type { MetadataRoute } from 'next'
import { writeClient } from '@/sanity/writeClient'

const BASE = 'https://www.offerdy.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: { slug: string; _updatedAt: string }[] = []
  let posts: { slug: string; _updatedAt: string }[] = []
  let reviews: { slug: string; _updatedAt: string }[] = []
  let pages: { slug: string; _updatedAt: string }[] = []
  let categories: { slug: string; _updatedAt: string }[] = []
  let deals: { slug: string; _updatedAt: string }[] = []

  try {
    ;[stores, posts, reviews, pages, categories, deals] = await Promise.all([
      writeClient.fetch(`*[_type == "store" && published != false]{ "slug": slug.current, _updatedAt }`),
      writeClient.fetch(`*[_type == "post" && defined(publishedAt) && publishedAt <= now()]{ "slug": slug.current, _updatedAt }`),
      writeClient.fetch(`*[_type == "review" && (!defined(publishedAt) || publishedAt <= now())]{ "slug": slug.current, _updatedAt }`),
      writeClient.fetch(`*[_type == "page" && published != false]{ "slug": slug.current, _updatedAt }`),
      writeClient.fetch(`*[_type == "category"]{ "slug": slug.current, _updatedAt }`),
      writeClient.fetch(`*[_type == "deal"]{ "slug": slug.current, _updatedAt }`),
    ])
  } catch {}

  const now = new Date()
  const statics: MetadataRoute.Sitemap = [
    { url: BASE,                            lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/stores`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/deals`,                 lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/flash-sales`,           lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/coupon-codes`,          lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/reviews`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/blog`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/comparisons`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/tips-guides`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/categories`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/about`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/author`,                lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,               lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/submit-deal`,           lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/partner`,               lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/terms`,                 lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/cookies`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/affiliate-disclosure`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  return [
    ...statics,
    ...stores.filter(s => s.slug).map(s => ({
      url: `${BASE}/stores/${s.slug}`,
      lastModified: s._updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.filter(p => p.slug).map(p => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...reviews.filter(r => r.slug).map(r => ({
      url: `${BASE}/reviews/${r.slug}`,
      lastModified: r._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...pages.filter(p => p.slug).map(p => ({
      url: `${BASE}/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...categories.filter(c => c.slug).map(c => ({
      url: `${BASE}/categories/${c.slug}`,
      lastModified: c._updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...deals.filter(d => d.slug).map(d => ({
      url: `${BASE}/deals/${d.slug}`,
      lastModified: d._updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
