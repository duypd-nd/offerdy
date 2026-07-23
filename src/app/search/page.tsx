import Link from 'next/link'
import Image from 'next/image'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { writeClient } from '@/sanity/writeClient'

export const dynamic = 'force-dynamic'

// ── SVG icons (no emoji — renders broken on Windows) ─────────────
function IconStore() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconDeal() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function IconCoupon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}
function IconFlash() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
}
function IconPost() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}
function IconReview() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}

// ── Types ────────────────────────────────────────────────────────
type ResultType = 'store' | 'deal' | 'coupon' | 'flash' | 'post' | 'review'

type SearchResult = {
  _id: string
  type: ResultType
  title: string
  slug: string
  sub?: string
  imageUrl?: string
  abbr?: string
}

const TYPE_META: Record<ResultType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  store:  { label: 'Stores',       color: '#2563eb', bg: '#eff6ff', icon: <IconStore /> },
  deal:   { label: 'Deals',        color: '#d97706', bg: '#fffbeb', icon: <IconDeal /> },
  coupon: { label: 'Coupon Codes', color: '#16a34a', bg: '#f0fdf4', icon: <IconCoupon /> },
  flash:  { label: 'Flash Sales',  color: '#dc2626', bg: '#fef2f2', icon: <IconFlash /> },
  post:   { label: 'Articles',     color: '#0891b2', bg: '#ecfeff', icon: <IconPost /> },
  review: { label: 'Reviews',      color: '#7c3aed', bg: '#f5f3ff', icon: <IconReview /> },
}

const TYPE_ORDER: ResultType[] = ['store', 'coupon', 'flash', 'deal', 'post', 'review']

function getUrl(r: SearchResult): string {
  if (r.type === 'store')  return `/stores/${r.slug}`
  if (r.type === 'deal')   return `/deals#${r.slug}`
  if (r.type === 'coupon') return `/coupon-codes`
  if (r.type === 'flash')  return `/flash-sales`
  if (r.type === 'post')   return `/blog/${r.slug}`
  if (r.type === 'review') return `/reviews/${r.slug}`
  return '/'
}

// ── GROQ search ──────────────────────────────────────────────────
async function searchContent(q: string): Promise<SearchResult[]> {
  if (!q || q.length < 2) return []
  const p = `*${q}*`
  try {
    const [stores, deals, coupons, flash, posts, reviews] = await Promise.all([
      writeClient.fetch<SearchResult[]>(
        `*[_type == "store" && (name match $p || abbr match $p) && published != false][0...20]{
          "_id": _id, "type": "store", "title": name, "slug": slug.current,
          "sub": coalesce(string(maxOffer) + "% off · " + category, "Store"),
          "imageUrl": image.asset->url, abbr
        }`, { p }
      ),
      writeClient.fetch<SearchResult[]>(
        `*[_type == "deal" && title match $p][0...15]{
          "_id": _id, "type": "deal", "title": title, "slug": slug.current,
          "sub": coalesce(priceSale + " · " + string(discount) + "% off", "Deal")
        }`, { p }
      ),
      writeClient.fetch<SearchResult[]>(
        `*[_type == "offer" && active == true && defined(couponCode) && couponCode != "" && (title match $p || couponCode match $p)][0...15]{
          "_id": _id, "type": "coupon", "title": title, "slug": _id,
          "sub": couponCode + " · " + store->name
        }`, { p }
      ),
      writeClient.fetch<SearchResult[]>(
        `*[_type == "offer" && active == true && defined(expiresAt) && expiresAt > now() && title match $p][0...15]{
          "_id": _id, "type": "flash", "title": title, "slug": _id,
          "sub": "Expires " + expiresAt + " · " + store->name
        }`, { p }
      ),
      writeClient.fetch<SearchResult[]>(
        `*[_type == "post" && (title match $p || excerpt match $p) && defined(publishedAt) && publishedAt <= now()][0...10]{
          "_id": _id, "type": "post", "title": title, "slug": slug.current,
          "sub": coalesce(category, "Article")
        }`, { p }
      ),
      writeClient.fetch<SearchResult[]>(
        `*[_type == "review" && (title match $p || excerpt match $p) && (!defined(publishedAt) || publishedAt <= now())][0...10]{
          "_id": _id, "type": "review", "title": title, "slug": slug.current,
          "sub": coalesce(tag, "Review")
        }`, { p }
      ),
    ])
    return [
      ...(stores  ?? []),
      ...(deals   ?? []),
      ...(coupons ?? []),
      ...(flash   ?? []),
      ...(posts   ?? []),
      ...(reviews ?? []),
    ]
  } catch {
    return []
  }
}

// ── Page ─────────────────────────────────────────────────────────
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const query  = q.trim()
  const results = await searchContent(query)
  const total   = results.length

  const grouped = TYPE_ORDER.reduce(
    (acc, type) => { acc[type] = results.filter(r => r.type === type); return acc },
    {} as Record<ResultType, SearchResult[]>
  )

  return (
    <>
      <HeaderWrapper />
      <main style={{ minHeight: '70vh' }}>
        <div className="page-hero" style={{ paddingBottom: 32 }}>
          <div className="page-hero-eyebrow">Search</div>
          <h1 className="page-hero-title" style={{ fontSize: 28 }}>
            {query ? `Results for "${query}"` : 'Search Offerdy'}
          </h1>
          {query && (
            <p className="page-hero-sub" style={{ marginTop: 6 }}>
              {total > 0
                ? `${total} result${total !== 1 ? 's' : ''} across stores, deals, codes & articles`
                : 'No results found'}
            </p>
          )}

          <form method="get" action="/search" style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search stores, deals, coupon codes..."
              autoFocus={!query}
              style={{ width: '100%', maxWidth: 480, padding: '10px 16px', fontSize: 15, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#111827' }}
            />
            <button
              type="submit"
              style={{ padding: '10px 20px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Search
            </button>
          </form>
        </div>

        <div className="section" style={{ paddingTop: 8 }}>
          {!query && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0', fontSize: 15 }}>
              Type something above to search stores, deals, coupon codes, and articles.
            </div>
          )}

          {query && total === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <svg style={{ margin: '0 auto 16px', display: 'block', color: '#d1d5db' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No results for &quot;{query}&quot;</div>
              <div style={{ color: '#6b7280', marginBottom: 24 }}>Try a different keyword or browse by category.</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/stores" className="oa-btn" style={{ textDecoration: 'none' }}>Browse Stores</Link>
                <Link href="/deals" className="oa-btn" style={{ textDecoration: 'none' }}>Browse Deals</Link>
                <Link href="/coupon-codes" className="oa-btn" style={{ textDecoration: 'none' }}>Coupon Codes</Link>
              </div>
            </div>
          )}

          {query && total > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {TYPE_ORDER.map(type => {
                const items = grouped[type]
                if (!items.length) return null
                const meta = TYPE_META[type]
                return (
                  <div key={type}>
                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {meta.icon}
                      </span>
                      <h2 style={{ fontWeight: 700, fontSize: 17, margin: 0, color: '#111' }}>{meta.label}</h2>
                      <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                        {items.length}
                      </span>
                    </div>

                    {/* Result rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {items.map(r => (
                        <Link
                          key={r._id}
                          href={getUrl(r)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderRadius: 10, border: '1px solid #f1f5f9', background: '#fff', textDecoration: 'none', color: 'inherit' }}
                        >
                          {/* Thumbnail */}
                          <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, overflow: 'hidden' }}>
                            {type === 'store' && r.imageUrl
                              ? <Image src={r.imageUrl} alt={r.title} fill sizes="40px" style={{ objectFit: 'contain' }} />
                              : type === 'store'
                                ? (r.abbr ?? r.title.slice(0, 3).toUpperCase())
                                : meta.icon}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title}
                            </div>
                            {r.sub && (
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.sub}
                              </div>
                            )}
                          </div>
                          <svg style={{ color: '#9ca3af', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </Link>
                      ))}
                    </div>

                    {/* View-all links for paginated sections */}
                    {type === 'store' && items.length >= 20 && (
                      <Link href="/stores" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                        View all stores →
                      </Link>
                    )}
                    {type === 'coupon' && items.length >= 15 && (
                      <Link href="/coupon-codes" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                        View all coupon codes →
                      </Link>
                    )}
                    {type === 'flash' && items.length >= 15 && (
                      <Link href="/flash-sales" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                        View all flash sales →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
