'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Offer } from '@/sanity/queries'
import AffiliateLink from '@/components/AffiliateLink'

// Styles injected directly — avoids globals.css hot-reload issues
const CSS = `
.cc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
@media(max-width:1280px){.cc-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:960px){.cc-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.cc-grid{grid-template-columns:repeat(2,1fr)}}

.cc-card{background:#fff;border:1.5px solid #E4EAF2;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;transition:box-shadow .2s,border-color .2s,transform .2s;position:relative;overflow:hidden}
.cc-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#22C55E,#34D399)}
.cc-card:hover{border-color:#22C55E;box-shadow:0 0 0 3px rgba(34,197,94,.07),0 4px 16px rgba(15,25,41,.08);transform:translateY(-2px)}

.cc-card-store{display:flex;align-items:center;gap:7px}
.cc-store-av{width:26px;height:26px;border-radius:7px;background:#0F1929;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;letter-spacing:.3px;flex-shrink:0}
.cc-store-nm{font-size:11px;font-weight:700;color:#0F1929;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
a.cc-store-nm:hover{color:#16A34A}

.cc-card-title{font-size:12.5px;font-weight:600;color:#0F1929;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.cc-code-box{width:100%;display:flex;align-items:center;justify-content:space-between;gap:7px;background:#F6F8FB;border:1.5px dashed #D1D5E0;border-radius:8px;padding:8px 10px;cursor:pointer;transition:border-color .15s,background .15s;text-align:left}
.cc-code-box:hover{border-color:#22C55E;background:#F0FDF4}
.cc-code-box--on{border-style:solid;border-color:#22C55E;background:#F0FDF4}
.cc-code-val{font-family:ui-monospace,monospace;font-size:12px;font-weight:800;letter-spacing:1.5px;color:#0F1929;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.cc-reveal-pill{flex-shrink:0;font-size:9.5px;font-weight:800;padding:3px 8px;border-radius:99px;background:#22C55E;color:#fff;letter-spacing:.05em;white-space:nowrap;transition:background .15s}
.cc-reveal-pill--done{background:#16A34A}

.cc-card-foot{display:flex;align-items:center;gap:7px;margin-top:2px}
.cc-get-btn{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;background:#22C55E;color:#fff;font-size:11px;font-weight:700;border-radius:8px;transition:background .2s;text-decoration:none;flex-shrink:0}
.cc-get-btn:hover{background:#16A34A;color:#fff}
.cc-expiry{font-size:10px;color:#6B7694;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-expiry--hot{color:#dc2626;font-weight:700}

.cc-pager{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
.cc-pg-nums{display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:center}
.cc-pg-btn{min-width:38px;height:38px;padding:0 8px;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #E4EAF2;border-radius:10px;background:#fff;font-size:13px;font-weight:600;color:#0F1929;cursor:pointer;transition:all .15s;font-family:inherit;gap:5px;text-decoration:none}
.cc-pg-btn:hover:not(:disabled):not([aria-disabled="true"]){border-color:#22C55E;color:#16A34A;background:#F0FDF4}
.cc-pg-btn--on{border-color:#22C55E!important;background:#22C55E!important;color:#fff!important;pointer-events:none}
.cc-pg-btn:disabled,.cc-pg-btn[aria-disabled="true"]{opacity:.3;cursor:not-allowed;pointer-events:none}
.cc-pg-arrow{padding:0 14px;min-width:auto}
.cc-pg-dots{padding:0 2px;color:#A0AABF;font-size:15px;font-weight:700;user-select:none;line-height:38px}
`

// ── helpers ─────────────────────────────────────────────────────

function daysLeft(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function maskCode(code: string): string {
  const show = Math.min(4, Math.ceil(code.length / 2))
  return code.slice(0, show) + '•'.repeat(Math.max(4, code.length - show))
}

function getPageNums(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

// ── CouponCard ───────────────────────────────────────────────────

function CouponCard({ offer }: { offer: Offer }) {
  const [revealed, setReveal] = useState(false)
  const [copied,   setCopied] = useState(false)

  const handleClick = () => {
    if (!offer.couponCode) return
    if (!revealed) {
      setReveal(true)
      if (offer.link) window.open(offer.link, '_blank', 'noopener,noreferrer')
    }
    navigator.clipboard.writeText(offer.couponCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const days = offer.expiresAt ? daysLeft(offer.expiresAt) : null
  const hot  = days !== null && days <= 3 && days >= 0

  return (
    <div className="cc-card">
      {/* Store row */}
      <div className="cc-card-store">
        <span className="cc-store-av" style={{ padding: offer.store?.imageUrl ? 2 : undefined }}>
          {offer.store?.imageUrl
            ? <img src={offer.store.imageUrl} alt={offer.store.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 5 }} />
            : (offer.store?.abbr ?? offer.store?.name ?? '?').slice(0, 2).toUpperCase()}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {offer.store?.slug
            ? <a href={`/stores/${offer.store.slug}`} className="cc-store-nm">{offer.store.name}</a>
            : <span className="cc-store-nm">{offer.store?.name ?? '—'}</span>}
        </span>
        {offer.verified && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#16a34a" aria-label="Verified">
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
        )}
      </div>

      {/* Title */}
      <div className="cc-card-title">{offer.title}</div>

      {/* Code box */}
      <button
        className={`cc-code-box${revealed ? ' cc-code-box--on' : ''}`}
        onClick={handleClick}
        aria-label="Reveal and copy coupon code"
      >
        <span className="cc-code-val">
          {revealed ? offer.couponCode : maskCode(offer.couponCode ?? '')}
        </span>
        <span className={`cc-reveal-pill${revealed ? ' cc-reveal-pill--done' : ''}`}>
          {copied ? 'Copied!' : revealed ? 'Copy again' : 'Show Code'}
        </span>
      </button>

      {/* Footer */}
      <div className="cc-card-foot">
        <AffiliateLink href={offer.link} storeName={offer.store?.name} offerId={offer.id} className="cc-get-btn">
          Get Deal
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </AffiliateLink>
        {days !== null && days >= 0 && (
          <span className={`cc-expiry${hot ? ' cc-expiry--hot' : ''}`}>
            {hot
              ? `${days}d left`
              : new Date(offer.expiresAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────
// Khi khong loc: dieu huong bang <Link> that (URL /coupon-codes?page=N) de crawler
// doc duoc tung trang. Khi dang loc bang o tim kiem: ket qua loc khong phai URL
// rieng nen chuyen sang button + state cuc bo (onChange).

function Pagination({ page, total, hrefFor, onChange }: {
  page: number; total: number; hrefFor?: (p: number) => string; onChange?: (p: number) => void
}) {
  if (total <= 1) return null
  const pages = getPageNums(page, total)

  const Prev = hrefFor
    ? <Link className="cc-pg-btn cc-pg-arrow" href={hrefFor(Math.max(1, page - 1))} aria-disabled={page === 1} aria-label="Previous page">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Prev
      </Link>
    : <button className="cc-pg-btn cc-pg-arrow" onClick={() => onChange!(page - 1)} disabled={page === 1} aria-label="Previous page">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Prev
      </button>

  const Next = hrefFor
    ? <Link className="cc-pg-btn cc-pg-arrow" href={hrefFor(Math.min(total, page + 1))} aria-disabled={page === total} aria-label="Next page">
        Next
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </Link>
    : <button className="cc-pg-btn cc-pg-arrow" onClick={() => onChange!(page + 1)} disabled={page === total} aria-label="Next page">
        Next
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

  return (
    <nav className="cc-pager" aria-label="Pagination">
      {Prev}
      <div className="cc-pg-nums">
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`d${i}`} className="cc-pg-dots">…</span>
            : hrefFor
              ? <Link key={p} className={`cc-pg-btn${page === p ? ' cc-pg-btn--on' : ''}`} href={hrefFor(p)} aria-current={page === p ? 'page' : undefined}>{p}</Link>
              : <button key={p} className={`cc-pg-btn${page === p ? ' cc-pg-btn--on' : ''}`} onClick={() => onChange!(p)} aria-current={page === p ? 'page' : undefined}>{p}</button>
        )}
      </div>
      {Next}
    </nav>
  )
}

// ── Main ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function pageHref(p: number) {
  return p <= 1 ? '/coupon-codes' : `/coupon-codes?page=${p}`
}

export default function CouponCodesContent({ offers, page: initialPage, totalPages: initialTotalPages }: {
  offers: Offer[]; page: number; totalPages: number
}) {
  const [search, setSearch] = useState('')
  const [filterPage, setFilterPage] = useState(1)
  const isFiltering = search.length > 0

  const filtered = isFiltering
    ? offers.filter(o =>
        o.store?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.couponCode?.toLowerCase().includes(search.toLowerCase()) ||
        o.title?.toLowerCase().includes(search.toLowerCase())
      )
    : offers

  const totalPages = isFiltering ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : initialTotalPages
  const page = isFiltering ? filterPage : initialPage
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (v: string) => { setSearch(v); setFilterPage(1) }
  const handleFilterPage = (p: number) => {
    setFilterPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="section">
      {/* Inject component-scoped CSS */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 420 }}>
          <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#A0AABF', pointerEvents: 'none' }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            style={{ width: '100%', height: 42, paddingLeft: 38, paddingRight: 16, border: '1.5px solid #E4EAF2', borderRadius: 99, fontSize: 14, background: '#fff', outline: 'none', color: '#0F1929', fontFamily: 'inherit' }}
            placeholder="Search stores or coupon codes..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 13, color: '#6B7694', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {filtered.length} codes · {totalPages} page{totalPages !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🏷️</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#0F1929', marginBottom: 6 }}>
            {search ? 'No results found' : 'No coupon codes right now'}
          </div>
          <div style={{ fontSize: 14, color: '#6B7694' }}>
            {search ? 'Try a different search term.' : 'New codes are added regularly — check back soon.'}
          </div>
        </div>
      ) : (
        <div className="cc-grid">
          {paginated.map(o => <CouponCard key={o.id} offer={o} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 48 }}>
          {isFiltering
            ? <Pagination page={page} total={totalPages} onChange={handleFilterPage} />
            : <Pagination page={page} total={totalPages} hrefFor={pageHref} />
          }
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#6B7694' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} codes
          </p>
        </div>
      )}
    </div>
  )
}
