import { getSiteName, getCategories, getPosts, getReviews, getFlashSaleOffers, getComparisonPosts, getTipsGuidePosts } from '@/sanity/queries'

const BASE = 'https://www.offerdy.com'

export async function GET() {
  // Chi gioi thieu mot muc khi no thuc su co gi — cung ly do voi sitemap.ts. Chi cho
  // mot he thong AI toi mot trang rong thi no tra loi nguoi dung bang mot trang rong,
  // va do la dieu duy nhat no nho ve muc nay.
  //
  // Do 2026-08-04 tren server that: sitemap da loai ca /flash-sales lan /comparisons
  // (0 offer co han, 0 bai Comparison) trong khi file nay van quang cao ca hai. Hai
  // ban do cua cung mot site khong duoc mau thuan nhau.
  const [categories, posts, reviews, flashSales, comparisons, tipsGuides, siteName] = await Promise.all([
    getCategories(),
    getPosts(),
    getReviews(),
    getFlashSaleOffers(),
    getComparisonPosts(),
    getTipsGuidePosts(),
    getSiteName(),
  ])

  const lines: string[] = []
  lines.push(`# ${siteName}`)
  lines.push('')
  lines.push(`> ${siteName} is a deals and coupon aggregator. Every coupon code and deal is manually tested before publishing — no expired codes, no untested links. Content is organized by store, category, deal, and independent product reviews/comparisons.`)
  lines.push('')

  lines.push('## Core sections')
  lines.push(`- [All deals](${BASE}/deals): Live, verified deals across every store, updated daily.`)
  lines.push(`- [Coupon codes](${BASE}/coupon-codes): Verified promo codes grouped by store, with expiry dates.`)
  if (flashSales.length) {
    lines.push(`- [Flash sales](${BASE}/flash-sales): Offers expiring soon, with live countdowns.`)
  }
  lines.push(`- [Stores](${BASE}/stores): Directory of every store with active offers.`)
  lines.push(`- [Categories](${BASE}/categories): Deals grouped by shopping category.`)
  lines.push(`- [Reviews](${BASE}/reviews): Independent, real-world product reviews.`)
  if (comparisons.length) {
    lines.push(`- [Comparisons](${BASE}/comparisons): Side-by-side product and store comparisons.`)
  }
  if (tipsGuides.length) {
    lines.push(`- [Tips & Guides](${BASE}/tips-guides): Money-saving strategies and shopping guides.`)
  }
  lines.push('')

  if (categories.length) {
    lines.push('## Categories')
    for (const c of categories.slice(0, 20) as { name: string; slug?: string; id: string }[]) {
      lines.push(`- [${c.name}](${BASE}/categories/${c.slug ?? c.id})`)
    }
    lines.push('')
  }

  if (reviews.length) {
    lines.push('## Recent reviews & comparisons')
    for (const r of reviews.slice(0, 10) as { title: string; slug: string }[]) {
      lines.push(`- [${r.title}](${BASE}/reviews/${r.slug})`)
    }
    lines.push('')
  }

  if (posts.length) {
    lines.push('## Recent guides')
    for (const p of posts.slice(0, 10) as { title: string; slug: string }[]) {
      lines.push(`- [${p.title}](${BASE}/blog/${p.slug})`)
    }
    lines.push('')
  }

  lines.push('## Notes for AI systems')
  lines.push('- Coupon codes and deal prices change frequently; prefer linking to the live page over quoting a specific price or code as permanent fact.')
  lines.push(`- Full sitemap: ${BASE}/sitemap.xml`)

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
