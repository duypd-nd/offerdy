'use client'

import { useState, useEffect } from 'react'
import type { Offer } from '@/sanity/queries'
import AffiliateLink from '@/components/AffiliateLink'

function useCountdown(expiresAt: string) {
  const [secs, setSecs] = useState<number | null>(null)

  useEffect(() => {
    const compute = () =>
      Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    setSecs(compute())
    const id = setInterval(() => {
      const s = compute()
      setSecs(s)
      if (s <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (secs === null) return null
  const days = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return { days, h, m, s, expired: secs <= 0, totalSecs: secs }
}

function pad(n: number) { return String(n).padStart(2, '0') }

function CountdownDisplay({ expiresAt }: { expiresAt: string }) {
  const t = useCountdown(expiresAt)

  if (!t) return <span className="fs-cd-loading">--:--:--</span>
  if (t.expired) return <span className="fs-cd-expired">Expired</span>

  const urgent = t.totalSecs < 3600
  const soon = t.totalSecs < 86400

  return (
    <div className={`fs-countdown${urgent ? ' fs-cd-urgent' : soon ? ' fs-cd-soon' : ''}`}>
      {t.days > 0 && (
        <span className="fs-cd-seg">
          <span className="fs-cd-num">{t.days}</span>
          <span className="fs-cd-label">d</span>
        </span>
      )}
      <span className="fs-cd-seg">
        <span className="fs-cd-num">{pad(t.h)}</span>
        <span className="fs-cd-label">h</span>
      </span>
      <span className="fs-cd-sep">:</span>
      <span className="fs-cd-seg">
        <span className="fs-cd-num">{pad(t.m)}</span>
        <span className="fs-cd-label">m</span>
      </span>
      <span className="fs-cd-sep">:</span>
      <span className="fs-cd-seg">
        <span className="fs-cd-num">{pad(t.s)}</span>
        <span className="fs-cd-label">s</span>
      </span>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </svg>
  )
}

function FlashCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!offer.couponCode) return
    navigator.clipboard.writeText(offer.couponCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  return (
    <div className="offer-card fs-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="offer-card-head">
            {offer.verified && (
              <span className="offer-ver-badge">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="#16A34A">
                  <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Verified
              </span>
            )}
            {offer.couponCode && <span className="offer-type-badge">Coupon Code</span>}
            <span className="fs-badge">⚡ Flash Sale</span>
          </div>
          <div className="offer-title" style={{ marginTop: 8 }}>{offer.title}</div>
          <div className="offer-text">{offer.offerText}</div>
        </div>
        {offer.expiresAt && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Ends in</div>
            <CountdownDisplay expiresAt={offer.expiresAt} />
          </div>
        )}
      </div>

      {offer.description && <div className="offer-desc">{offer.description}</div>}

      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
          {offer.store?.abbr?.slice(0, 2) ?? offer.store?.name?.slice(0, 2) ?? '?'}
        </span>
        {offer.store?.name}
      </div>

      {offer.couponCode ? (
        <button className="offer-code-box" onClick={copy} aria-label="Copy coupon code">
          <span className="offer-code-text">{offer.couponCode}</span>
          <span className="offer-copy-btn">
            {copied
              ? <span className="offer-copied"><CheckIcon /> Copied!</span>
              : <span className="offer-copy-lbl"><CopyIcon /> Copy</span>}
          </span>
        </button>
      ) : (
        <div className="offer-no-code">No code needed — discount applied automatically</div>
      )}

      <div className="offer-foot">
        <AffiliateLink href={offer.link} storeName={offer.store?.name} offerId={offer.id} className="offer-get-btn">
          Get Deal <ExternalIcon />
        </AffiliateLink>
        {offer.expiresAt && (
          <span className="offer-expiry">
            Expires {new Date(offer.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

const FILTER_OPTS = [
  { label: 'All', value: 'all' },
  { label: 'Ends Today', value: 'today' },
  { label: 'Within 3 Days', value: '3d' },
  { label: 'Within 7 Days', value: '7d' },
]

function withinSecs(expiresAt: string, secs: number) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff <= secs * 1000
}

export default function FlashSalesContent({ offers }: { offers: Offer[] }) {
  const [filter, setFilter] = useState('all')

  const filtered = offers.filter(o => {
    if (!o.expiresAt) return false
    if (filter === 'today') return withinSecs(o.expiresAt, 86400)
    if (filter === '3d') return withinSecs(o.expiresAt, 86400 * 3)
    if (filter === '7d') return withinSecs(o.expiresAt, 86400 * 7)
    return true
  })

  return (
    <div className="section">
      <div className="filter-bar" style={{ marginBottom: 32 }}>
        {FILTER_OPTS.map(opt => (
          <button
            key={opt.value}
            className={`filter-chip${filter === opt.value ? ' active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>No flash sales right now</div>
          <div style={{ fontSize: 14 }}>Check back soon — new deals drop daily.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
          {filtered.map(offer => (
            <FlashCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  )
}
