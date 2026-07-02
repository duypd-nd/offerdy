'use client'

import { useState } from 'react'
import type { Deal } from '@/data/deals'
import AffiliateLink from '@/components/AffiliateLink'

type Filter = 'all' | 'verified' | 'expiring'

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="#16A34A">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="deal-card">
      <div className="disc-badge">
        <span className="disc-pct">{deal.discount}%</span>
        <span className="disc-off">OFF</span>
      </div>
      {deal.verified !== false && (
        <div className="ver-badge">
          <CheckIcon />Verified
        </div>
      )}
      <div className={`deal-img ${deal.imgClass ?? 'di-tech'}`}>{deal.emoji}</div>
      <div className="deal-body">
        <div className="deal-store">{deal.store}</div>
        <div className="deal-title">{deal.title}</div>
        <div className="deal-price-row">
          <span className="price-sale">{deal.priceSale}</span>
          <span className="price-orig">{deal.priceOrig}</span>
        </div>
        {deal.dealUrl ? (
          <AffiliateLink href={deal.dealUrl} storeName={deal.store} className="deal-cta">
            Get Deal →
          </AffiliateLink>
        ) : (
          <button className="deal-cta">Get Deal →</button>
        )}
      </div>
    </div>
  )
}

export default function StoreDealsFilter({ deals }: { deals: Deal[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const verified = deals.filter(d => d.verified !== false)
  const expiring = deals.filter(d => d.isExpiring)

  const visible =
    filter === 'verified' ? verified :
    filter === 'expiring' ? expiring :
    deals

  return (
    <div>
      <div className="store-deals-bar">
        <button
          className={`filter-chip${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All deals ({deals.length})
        </button>
        <button
          className={`filter-chip${filter === 'verified' ? ' active' : ''}`}
          onClick={() => setFilter('verified')}
        >
          ✓ Verified ({verified.length})
        </button>
        {expiring.length > 0 && (
          <button
            className={`filter-chip${filter === 'expiring' ? ' active' : ''}`}
            onClick={() => setFilter('expiring')}
          >
            ⏰ Expiring soon ({expiring.length})
          </button>
        )}
        <span className="store-deals-count">{visible.length} deal{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {visible.length === 0 ? (
        <div className="store-empty">
          <div className="store-empty-icon">🔍</div>
          <div className="store-empty-title">No deals match this filter</div>
          <div className="store-empty-sub">Try another filter or check back soon.</div>
        </div>
      ) : (
        <div className="deals-grid">
          {visible.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}
