'use client'

import { useState } from 'react'
import type { Offer } from '@/sanity/queries'

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export default function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!offer.couponCode) return
    navigator.clipboard.writeText(offer.couponCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const days = offer.expiresAt ? daysUntil(offer.expiresAt) : null
  const expiringSoon = days !== null && days <= 3
  const expired = days !== null && days < 0

  if (expired) return null

  return (
    <div className="offer-card">
      <div className="offer-card-head">
        <span className="offer-ver-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#16A34A"><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          Verified
        </span>
        {offer.couponCode && (
          <span className="offer-type-badge">Coupon Code</span>
        )}
      </div>

      <div className="offer-title">{offer.title}</div>
      <div className="offer-text">{offer.offerText}</div>

      {offer.description && (
        <div className="offer-desc">{offer.description}</div>
      )}

      {offer.couponCode ? (
        <button className="offer-code-box" onClick={copy} aria-label="Copy coupon code">
          <span className="offer-code-text">{offer.couponCode}</span>
          <span className="offer-copy-btn">
            {copied ? (
              <span className="offer-copied"><CheckIcon /> Copied!</span>
            ) : (
              <span className="offer-copy-lbl"><CopyIcon /> Copy</span>
            )}
          </span>
        </button>
      ) : (
        <div className="offer-no-code">No code needed — discount applied automatically</div>
      )}

      <div className="offer-foot">
        <a href={offer.link} target="_blank" rel="noopener noreferrer" className="offer-get-btn">
          Get Offer <ExternalIcon />
        </a>
        {days !== null && (
          <span className={`offer-expiry${expiringSoon ? ' offer-expiry-soon' : ''}`}>
            {expiringSoon
              ? `⏰ Expires in ${days}d`
              : `Expires ${new Date(offer.expiresAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            }
          </span>
        )}
      </div>
    </div>
  )
}
