'use client'

import { useState, useEffect } from 'react'
import type { Offer } from '@/sanity/queries'
import { voteOffer } from '@/actions/voteOffer'
import AffiliateLink from '@/components/AffiliateLink'

type Filter = 'all' | 'verified' | 'codes' | 'deals'

function VoteButtons({ offerId, initialActive, initialExpired }: {
  offerId: string
  initialActive: number
  initialExpired: number
}) {
  const [voted, setVoted] = useState<'active' | 'expired' | null>(null)
  const [counts, setCounts] = useState({ active: initialActive, expired: initialExpired })
  const [done, setDone] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`vote_${offerId}`)
    if (stored === 'active' || stored === 'expired') {
      setVoted(stored)
      setDone(true)
    }
  }, [offerId])

  const handleVote = async (type: 'active' | 'expired') => {
    if (voted) return
    localStorage.setItem(`vote_${offerId}`, type)
    setVoted(type)
    setDone(true)
    setCounts(c => ({ ...c, [type]: c[type] + 1 }))
    try { await voteOffer(offerId, type) } catch {}
  }

  const total = counts.active + counts.expired
  const pct = total >= 5 ? Math.round((counts.active / total) * 100) : null

  if (done) {
    return (
      <div className="sol-vote sol-vote-done">
        <span className={`sol-vote-confirm${voted === 'active' ? ' yes' : ' no'}`}>
          {voted === 'active' ? '✅ Marked as working' : '❌ Marked as expired'}
        </span>
        {total >= 3 && (
          <span className="sol-vote-tally">
            <span className="sol-tally-yes">👍 {counts.active}</span>
            <span className="sol-tally-sep">·</span>
            <span className="sol-tally-no">👎 {counts.expired}</span>
          </span>
        )}
        {pct !== null && <span className="sol-vote-pct">{pct}% success rate</span>}
      </div>
    )
  }

  return (
    <div className="sol-vote">
      <span className="sol-vote-q">Still working?</span>
      <button className="sol-vote-btn sol-vote-yes" onClick={() => handleVote('active')}>
        👍 Yes
      </button>
      <button className="sol-vote-btn sol-vote-no" onClick={() => handleVote('expired')}>
        👎 Expired
      </button>
      {total >= 5 && <span className="sol-vote-pct">{pct}% success</span>}
    </div>
  )
}

function OfferRow({ offer, defaultDescriptions, index, destinationUrl, storeName }: {
  offer: Offer
  defaultDescriptions: string[]
  index: number
  destinationUrl: string
  storeName?: string
}) {
  const defaultDescription = defaultDescriptions.length > 0
    ? defaultDescriptions[index % defaultDescriptions.length]
    : undefined
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasCode = !!offer.couponCode

  if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) return null

  const daysLeft = offer.expiresAt
    ? Math.ceil((new Date(offer.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="sol-row">
      {/* Discount */}
      <div className="sol-disc">{offer.offerText || (hasCode ? 'Code' : 'Deal')}</div>

      {/* Body */}
      <div className="sol-body">
        <div className="sol-meta">
          {offer.verified !== false && (
            <span className={`sol-vbadge${hasCode ? '' : ' deal'}`}>
              ✓ Verified {hasCode ? 'Code' : 'Deal'}
            </span>
          )}
          {daysLeft !== null && daysLeft <= 7 && (
            <span className="sol-exp">⏰ {daysLeft}d left</span>
          )}
        </div>
        <div className="sol-title">{offer.title}</div>
        {(offer.description || defaultDescription) && (
          <p className="sol-desc">{offer.description || defaultDescription}</p>
        )}
        <VoteButtons
          offerId={offer.id}
          initialActive={offer.votesActive ?? 0}
          initialExpired={offer.votesExpired ?? 0}
        />
      </div>

      {/* CTA */}
      <div className="sol-cta">
        {hasCode ? (
          revealed ? (
            <div className="sol-code-revealed">
              <span className="sol-code-val">{offer.couponCode}</span>
              <button
                className="sol-copy"
                onClick={() => {
                  navigator.clipboard.writeText(offer.couponCode as string)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <AffiliateLink
              href={destinationUrl}
              storeName={storeName}
              offerId={offer.id}
              className="sol-get-code"
              onClick={() => setRevealed(true)}
            >
              <span className="sol-gc-btn">Get Code</span>
              <span className="sol-gc-peek">{(offer.couponCode as string).slice(0, 4)}***</span>
            </AffiliateLink>
          )
        ) : (
          <AffiliateLink href={destinationUrl} storeName={storeName} offerId={offer.id} className="sol-get-deal">
            Get Deal →
          </AffiliateLink>
        )}
      </div>
    </div>
  )
}

export default function StoreOfferList({
  offers,
  defaultDescription,
  storeName,
  affiliateLink,
  storeWebsite,
}: {
  offers: Offer[]
  defaultDescription?: string
  storeName?: string
  affiliateLink?: string
  storeWebsite?: string
}) {
  const defaultDescriptions = (defaultDescription ?? '')
    .split('\n')
    .map(s => s.trim().replace(/\{store\}/g, storeName ?? ''))
    .filter(Boolean)
  const destinationUrl = affiliateLink ?? (storeWebsite ? `https://${storeWebsite.replace(/^https?:\/\//, '')}` : '#')
  const [filter, setFilter] = useState<Filter>('all')

  const active   = offers.filter(o => !o.expiresAt || new Date(o.expiresAt) >= new Date())
  const codes    = active.filter(o => !!o.couponCode)
  const deals    = active.filter(o => !o.couponCode)
  const verified = active.filter(o => o.active !== false)

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: active.length },
    { key: 'verified', label: 'Verified', count: verified.length },
  ]
  if (codes.length) tabs.push({ key: 'codes', label: 'Codes', count: codes.length })
  if (deals.length) tabs.push({ key: 'deals', label: 'Deals', count: deals.length })

  const visible =
    filter === 'codes'    ? codes    :
    filter === 'deals'    ? deals    :
    filter === 'verified' ? verified :
    active

  return (
    <div>
      <div className="sol-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`sol-tab${filter === t.key ? ' active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}({t.count})
          </button>
        ))}
      </div>
      <div className="sol-list">
        {visible.length === 0 ? (
          <div className="sol-empty">No offers match this filter.</div>
        ) : (
          visible.map((o, i) => (
            <OfferRow
              key={o.id}
              offer={o}
              defaultDescriptions={defaultDescriptions}
              index={i}
              destinationUrl={destinationUrl}
              storeName={storeName}
            />
          ))
        )}
      </div>
    </div>
  )
}
