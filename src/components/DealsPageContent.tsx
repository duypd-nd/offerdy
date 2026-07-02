'use client'

import { useState } from 'react'
import type { Deal } from '@/data/deals'
import AffiliateLink from '@/components/AffiliateLink'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'

const PAGE_SIZE = 20

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="#16A34A">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

export default function DealsPageContent({ deals }: { deals: Deal[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(deals.length / PAGE_SIZE)
  const paginated = deals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goTo = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="section" style={{ paddingTop: 24 }}>
        <div className="section-header">
          <div>
            <div className="section-title">All Deals</div>
            <div className="section-sub">
              {deals.length} deals found · 100% verified
              {totalPages > 1 && ` · Trang ${page}/${totalPages}`}
            </div>
          </div>
        </div>

        <div className="deals-grid">
          {paginated.map(deal => {
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
                  ? <img src={deal.imageUrl} alt={deal.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : (deal.emoji ?? '🏷️')
                }
              </AffiliateLink>
              <div className="deal-body">
                <div className="deal-store">{deal.store}</div>
                <div className="deal-title">{deal.title}</div>
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

        {deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            Chưa có deal nào.
          </div>
        )}

        {totalPages > 1 && (
          <div className="deals-pagination">
            <button className="dpag-btn dpag-arrow" onClick={() => goTo(1)} disabled={page === 1}>«</button>
            <button className="dpag-btn dpag-arrow" onClick={() => goTo(page - 1)} disabled={page === 1}>‹</button>
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
                  : <button key={p} className={`dpag-btn${page === p ? ' dpag-active' : ''}`} onClick={() => goTo(p as number)}>{p}</button>
              )
            }
            <button className="dpag-btn dpag-arrow" onClick={() => goTo(page + 1)} disabled={page === totalPages}>›</button>
            <button className="dpag-btn dpag-arrow" onClick={() => goTo(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>
    </>
  )
}
