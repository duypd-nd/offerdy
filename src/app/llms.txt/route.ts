import { getCategories, getPosts, getReviews } from '@/sanity/queries'

const BASE = 'https://www.offerdy.com'

export async function GET() {
  const [categories, posts, reviews] = await Promise.all([
    getCategories(),
    getPosts(),
    getReviews(),
  ])

  const lines: string[] = []
  lines.push('# Offerdy')
  lines.push('')
  lines.push('> Offerdy is a deals and coupon aggregator. Every coupon code and deal is manually tested before publishing — no expired codes, no untested links. Content is organized by store, category, deal, and independent product reviews/comparisons.')
  lines.push('')

  lines.push('## Core sections')
  lines.push(`- [All deals](${BASE}/deals): Live, verified deals across every store, updated daily.`)
  lines.push(`- [Coupon codes](${BASE}/coupon-codes): Verified promo codes grouped by store, with expiry dates.`)
  lines.push(`- [Flash sales](${BASE}/flash-sales): Offers expiring soon, with live countdowns.`)
  lines.push(`- [Stores](${BASE}/stores): Directory of every store with active offers.`)
  lines.push(`- [Categories](${BASE}/categories): Deals grouped by shopping category.`)
  lines.push(`- [Reviews](${BASE}/reviews): Independent, real-world product reviews.`)
  lines.push(`- [Comparisons](${BASE}/comparisons): Side-by-side product and store comparisons.`)
  lines.push(`- [Tips & Guides](${BASE}/tips-guides): Money-saving strategies and shopping guides.`)
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
