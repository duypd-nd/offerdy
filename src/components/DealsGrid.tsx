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

export default function DealsGrid({ deals, columns, showVerified = true }: { deals: Deal[]; columns?: number; showVerified?: boolean }) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns ?? 5}, 1fr)` }
  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">⚡ Today&rsquo;s Best Deals</div>
          <div className="section-sub">Updated 8:30 AM — 100% verified</div>
        </div>
        <Link href="/deals" className="see-all">View all →</Link>
      </div>
      <div className="deals-grid" style={gridStyle}>
        {deals.map(deal => {
          const badge = dealDiscountBadge(deal)
          return (
          <div key={deal.id} className="deal-card">
            <div className="disc-badge">
              <span className="disc-pct">{badge.main}</span>
              {badge.sub && <span className="disc-off">{badge.sub}</span>}
            </div>
            {showVerified && (
              <div className="ver-badge">
                <CheckIcon />Verified
              </div>
            )}
            {deal.dealUrl
              ? <AffiliateLink href={deal.dealUrl} storeName={deal.store} className={`deal-img ${deal.imgClass ?? 'di-tech'}`}>
                  {deal.imageUrl ? <Image src={deal.imageUrl} alt={deal.title} fill sizes="(max-width: 768px) 45vw, 220px" style={{ objectFit: 'cover' }} /> : (deal.emoji ?? '🏷️')}
                </AffiliateLink>
              : <div className={`deal-img ${deal.imgClass ?? 'di-tech'}`}>
                  {deal.imageUrl ? <Image src={deal.imageUrl} alt={deal.title} fill sizes="(max-width: 768px) 45vw, 220px" style={{ objectFit: 'cover' }} /> : (deal.emoji ?? '🏷️')}
                </div>
            }
            <div className="deal-body">
              <div className="deal-store">{deal.store}</div>
              <div className="deal-title">{deal.title}</div>
              <div className="deal-price-row">
                <span className="price-sale">{deal.priceSale}</span>
                <span className="price-orig">{deal.priceOrig}</span>
              </div>
              {deal.dealUrl
                ? <AffiliateLink href={deal.dealUrl} storeName={deal.store} className="deal-cta">Get Deal →</AffiliateLink>
                : <span className="deal-cta deal-cta-disabled">Chưa có link</span>
              }
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
