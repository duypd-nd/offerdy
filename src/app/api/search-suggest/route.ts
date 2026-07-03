import { client, isConfigured } from '@/sanity/client'
import { fuzzyMatch, fuzzyScore } from '@/lib/fuzzy'

export const dynamic = 'force-dynamic'

type Raw = { name: string; abbr?: string; sub?: string; icon?: string; imageUrl?: string; slug?: string }
export type SuggestItem = { name: string; sub: string; icon: string; imageUrl?: string; url: string }

const PUBLISHED_FILTER = '(!defined(publishedAt) || publishedAt <= now())'

const SUGGEST_QUERY = `{
  "stores": *[_type == "store"]{ "name": name, abbr, "imageUrl": image.asset->url, "slug": slug.current },
  "deals": *[_type == "deal"]{ "name": title, "sub": coalesce(priceSale + " · " + string(discount) + "% off", "Deal"), "icon": emoji, "slug": slug.current },
  "reviews": *[_type == "review" && ${PUBLISHED_FILTER}]{ "name": title, "sub": coalesce(tag, "Review"), "icon": emoji, "slug": slug.current },
  "posts": *[_type == "post" && ${PUBLISHED_FILTER}]{ "name": title, "sub": coalesce(category, "Article"), "icon": coverEmoji, "slug": slug.current }
}`

function pickBest(items: Raw[], q: string, limit: number, keys: (keyof Raw)[]): Raw[] {
  return items
    .filter(item => keys.some(k => { const v = item[k]; return typeof v === 'string' && fuzzyMatch(v, q) }))
    .sort((a, b) => {
      const sa = Math.min(...keys.map(k => { const v = a[k]; return typeof v === 'string' ? fuzzyScore(v, q) : Infinity }))
      const sb = Math.min(...keys.map(k => { const v = b[k]; return typeof v === 'string' ? fuzzyScore(v, q) : Infinity }))
      return sa - sb
    })
    .slice(0, limit)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  const empty = { stores: [], deals: [], reviews: [], posts: [] }
  if (!isConfigured() || q.length < 2) return Response.json(empty)

  try {
    const data = await client.fetch<{ stores: Raw[]; deals: Raw[]; reviews: Raw[]; posts: Raw[] }>(SUGGEST_QUERY)

    const stores: SuggestItem[] = pickBest(data.stores ?? [], q, 5, ['name', 'abbr']).map(s => ({
      name: s.name,
      sub: 'Store',
      icon: s.abbr ?? s.name.slice(0, 3).toUpperCase(),
      imageUrl: s.imageUrl,
      url: s.slug ? `/stores/${s.slug}` : '/stores',
    }))
    const deals: SuggestItem[] = pickBest(data.deals ?? [], q, 4, ['name']).map(d => ({
      name: d.name, sub: d.sub ?? 'Deal', icon: d.icon ?? '⚡',
      url: d.slug ? `/deals#${d.slug}` : '/deals',
    }))
    const reviews: SuggestItem[] = pickBest(data.reviews ?? [], q, 3, ['name']).map(r => ({
      name: r.name, sub: r.sub ?? 'Review', icon: r.icon ?? '⭐',
      url: r.slug ? `/reviews/${r.slug}` : '/reviews',
    }))
    const posts: SuggestItem[] = pickBest(data.posts ?? [], q, 3, ['name']).map(p => ({
      name: p.name, sub: p.sub ?? 'Article', icon: p.icon ?? '📝',
      url: p.slug ? `/blog/${p.slug}` : '/blog',
    }))

    return Response.json({ stores, deals, reviews, posts })
  } catch {
    return Response.json(empty)
  }
}
