import type { MetadataRoute } from 'next'
import { client as readClient } from '@/sanity/client'
import { getCategorySlugsWithStores } from '@/sanity/queries'

const BASE = 'https://www.offerdy.com'

/**
 * ⚠️ KHONG DUOC BO DONG NAY.
 *
 * `sitemap.ts` la mot Route Handler **duoc cache mac dinh** — khong khai bao gi
 * thi Next sinh no MOT LAN luc build roi dong bang vinh vien. Ket qua do duoc
 * ngay 2026-08-04: sitemap tren production van la anh chup cua lan deploy cuoi
 * (~26/07), nen **22 trong 23 bai review — toan bo so viet ngay 03/08 cho dung
 * cac shop doi tac — chua bao gio duoc bao cho Google**, trong khi sitemap van
 * moi Google vao **14 trang store da bi xoa** (nay tra 404).
 *
 * Doi lai: noi dung moi vo hinh voi tim kiem cho den lan deploy sau, va Google
 * hoc duoc rang sitemap nay dan toi trang chet — dung thu can phai tranh nhat
 * khi 93% hien thi cua site da roi vao 404.
 *
 * 3600 chu khong phai 60 nhu cac trang noi dung: Google doc sitemap khoang mot
 * lan moi ngay, con moi lan sinh lai ton 8 luot truy van Sanity. Mot gio la du
 * tuoi cho tim kiem ma van chan duoc kha nang ai do goi lien tuc /sitemap.xml
 * lam cham han ngach.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: { slug: string; _updatedAt: string }[] = []
  let posts: { slug: string; _updatedAt: string }[] = []
  let reviews: { slug: string; _updatedAt: string }[] = []
  let pages: { slug: string; _updatedAt: string }[] = []
  let categories: { slug: string; _updatedAt: string }[] = []
  let deals: { slug: string; _updatedAt: string }[] = []
  // Dem rieng bai Comparison de quyet dinh co dua /comparisons vao sitemap khong.
  // Neu fetch loi -> giu 0 -> loai URL ra, dung huong an toan: tha bo sot mot URL
  // hop le (Google se crawl lai) con hon nop mot trang rong cho Google index.
  let comparisonCount = 0
  // Dem offer dang chay ma sap het han — cung ly do voi comparisonCount.
  // Do 2026-08-04: 0/303 offer co `expiresAt`, nghia la /flash-sales RONG hoan toan
  // trong khi sitemap van moi Google vao voi priority 0.9 + changeFrequency hourly.
  // Moi gio mot lan bao Google "trang nay vua doi" roi dan no toi mot trang khong co
  // gi la dung thu tin hieu can tranh nhat luc dang phuc hoi tu 93% hien thi roi vao
  // 404. Khi nao co offer that co expiresAt thi URL tu quay lai sitemap.
  let flashSaleCount = 0
  // Chi nop category doc nao thuc su co store. Cung ly do voi /comparisons.
  let categoriesWithStores: Set<string> = new Set()

  try {
    ;[stores, posts, reviews, pages, categories, deals, comparisonCount, flashSaleCount] = await Promise.all([
      readClient.fetch(`*[_type == "store" && published != false]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "post" && defined(publishedAt) && publishedAt <= now()]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "review" && (!defined(publishedAt) || publishedAt <= now())]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "page" && published != false]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "category"]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "deal"]{ "slug": slug.current, _updatedAt }`),
      // Cung dieu kien loc voi COMPARISON_POSTS_QUERY trong src/sanity/queries.ts —
      // hai cho phai khop nhau, neu doi filter o do thi doi ca o day.
      readClient.fetch(`count(*[_type == "post" && category == "Comparison" && (!defined(publishedAt) || publishedAt <= now())])`),
      // Cung dieu kien loc voi FLASH_SALES_QUERY trong src/sanity/queries.ts —
      // hai cho phai khop nhau, neu doi filter o do thi doi ca o day.
      readClient.fetch(`count(*[_type == "offer" && active == true && defined(expiresAt) && expiresAt > now()])`),
    ])
  } catch {}

  categoriesWithStores = await getCategorySlugsWithStores()

  const now = new Date()
  const statics: MetadataRoute.Sitemap = [
    { url: BASE,                            lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/stores`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/deals`,                 lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    ...(flashSaleCount > 0
      ? [{ url: `${BASE}/flash-sales`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 }]
      : []),
    { url: `${BASE}/coupon-codes`,          lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/reviews`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/blog`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    ...(comparisonCount > 0
      ? [{ url: `${BASE}/comparisons`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }]
      : []),
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
    ...categories.filter(c => c.slug && categoriesWithStores.has(c.slug)).map(c => ({
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
