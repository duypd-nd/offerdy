import Link from 'next/link'
import Image from 'next/image'
import type { Deal } from '@/data/deals'
import AffiliateLink from '@/components/AffiliateLink'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="#16A34A">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

type DealCategory = { name: string; emoji?: string; slug: string }

/** Giu category khi doi trang, va bo ?page khi doi category (ve trang 1) —
 *  neu khong, doi sang danh muc it deal hon se rot vao trang khong ton tai. */
function dealsHref(page: number, category?: string) {
  const qs = new URLSearchParams()
  if (category) qs.set('category', category)
  if (page > 1) qs.set('page', String(page))
  const q = qs.toString()
  return `/deals${q ? `?${q}` : ''}`
}

export default function DealsPageContent({ deals, page, totalPages, totalCount, categories = [], activeCategory }: {
  deals: Deal[]; page: number; totalPages: number; totalCount: number
  categories?: DealCategory[]; activeCategory?: string
}) {
  const pageHref = (p: number) => dealsHref(p, activeCategory)
  const activeName = categories.find(c => c.slug === activeCategory)?.name

  return (
    <>
      <div className="section" style={{ paddingTop: 24 }}>
        <div className="section-header">
          <div>
            <div className="section-title">{activeName ? `${activeName} Deals` : 'All Deals'}</div>
            <div className="section-sub">
              {totalCount} deals found · 100% verified
              {totalPages > 1 && ` · Page ${page}/${totalPages}`}
            </div>
          </div>
        </div>

        {/* Dung lai .sol-tabs/.sol-tab co san trong globals.css (StoreOfferList dang
            dung) thay vi them class moi — da co hover + trang thai .active. Chi them
            textDecoration inline vi class do von viet cho <button>, khong phai <a>.
            Chi render khi co it nhat 1 danh muc duoc gan, tranh thanh tab tro tren
            trong luc admin chua phan loai deal nao. */}
        {categories.length > 0 && (
          <div className="sol-tabs" style={{ flexWrap: 'wrap' }}>
            <Link
              href={dealsHref(1)}
              className={`sol-tab${!activeCategory ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
              aria-current={!activeCategory ? 'page' : undefined}
            >
              All
            </Link>
            {categories.map(c => (
              <Link
                key={c.slug}
                href={dealsHref(1, c.slug)}
                className={`sol-tab${activeCategory === c.slug ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
                aria-current={activeCategory === c.slug ? 'page' : undefined}
              >
                {c.emoji && <span aria-hidden="true">{c.emoji} </span>}{c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="deals-grid">
          {deals.map(deal => {
            const badge = dealDiscountBadge(deal)
            return (
            <div key={deal.id} className="deal-card">
              <div className="disc-badge">
                <span className="disc-pct">{badge.main}</span>
                {badge.sub && <span className="disc-off">{badge.sub}</span>}
              </div>
              <div className="ver-badge"><CheckIcon />Verified</div>
              <AffiliateLink href={deal.dealUrl ?? '#'} storeName={deal.store} className={`deal-img ${deal.imgClass ?? 'di-tech'}`}>
                {deal.imageUrl
                  ? <Image src={deal.imageUrl} alt={deal.title} fill sizes="(max-width: 768px) 45vw, 220px" style={{ objectFit: 'cover' }} />
                  : (deal.emoji ?? '🏷️')
                }
              </AffiliateLink>
              <div className="deal-body">
                {deal.store && <div className="deal-store">{deal.store}</div>}
                {deal.slug ? (
                  <Link href={`/deals/${deal.slug}`} className="deal-title" style={{ textDecoration: 'none', color: '#2563eb' }}>{deal.title}</Link>
                ) : (
                  <div className="deal-title">{deal.title}</div>
                )}
                <div className="deal-price-row">
                  <span className="price-sale">{deal.priceSale}</span>
                  <span className="price-orig">{deal.priceOrig}</span>
                </div>
                <AffiliateLink href={deal.dealUrl ?? '#'} storeName={deal.store} className="deal-cta">Get Deal →</AffiliateLink>
              </div>
            </div>
            )
          })}
        </div>

        {totalCount === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            No deals yet.
          </div>
        )}

        {totalPages > 1 && (
          <div className="deals-pagination">
            <Link className={`dpag-btn dpag-arrow${page === 1 ? ' dpag-disabled' : ''}`} href={pageHref(1)} aria-disabled={page === 1}>«</Link>
            <Link className={`dpag-btn dpag-arrow${page === 1 ? ' dpag-disabled' : ''}`} href={pageHref(Math.max(1, page - 1))} aria-disabled={page === 1}>‹</Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="dpag-ellipsis">…</span>
                  : <Link key={p} className={`dpag-btn${page === p ? ' dpag-active' : ''}`} href={pageHref(p as number)}>{p}</Link>
              )
            }
            <Link className={`dpag-btn dpag-arrow${page === totalPages ? ' dpag-disabled' : ''}`} href={pageHref(Math.min(totalPages, page + 1))} aria-disabled={page === totalPages}>›</Link>
            <Link className={`dpag-btn dpag-arrow${page === totalPages ? ' dpag-disabled' : ''}`} href={pageHref(totalPages)} aria-disabled={page === totalPages}>»</Link>
          </div>
        )}
      </div>
    </>
  )
}
