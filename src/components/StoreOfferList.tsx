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

function fmtExpiredDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return iso }
}

function OfferRow({ offer, defaultDescriptions, index, destinationUrl, storeName, expired, now }: {
  offer: Offer
  defaultDescriptions: string[]
  index: number
  destinationUrl: string
  storeName?: string
  expired?: boolean
  now: number
}) {
  const defaultDescription = defaultDescriptions.length > 0
    ? defaultDescriptions[index % defaultDescriptions.length]
    : undefined
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasCode = !!offer.couponCode

  // Dung `now` do server truyen xuong, KHONG goi Date.now() o day: component nay
  // la 'use client' nen no chay ca luc SSR lan luc hydrate. Hai lan goi Date.now()
  // cach nhau (trang cache ISR 60s + lech dong ho may user) co the ra so ngay khac
  // nhau -> hydration mismatch. Xem chu thich o StoreOfferList.
  const daysLeft = offer.expiresAt
    ? Math.ceil((new Date(offer.expiresAt).getTime() - now) / 86400000)
    : null

  return (
    <div className={`sol-row${expired ? ' sol-row-expired' : ''}`}>
      {/* Discount */}
      <div className="sol-disc">{offer.offerText || (hasCode ? 'Code' : 'Deal')}</div>

      {/* Body */}
      <div className="sol-body">
        <div className="sol-meta">
          {expired ? (
            <span className="sol-expired-badge">✕ Expired {offer.expiresAt && fmtExpiredDate(offer.expiresAt)}</span>
          ) : (
            <>
              {offer.verified !== false && (
                <span className={`sol-vbadge${hasCode ? '' : ' deal'}`}>
                  ✓ Verified {hasCode ? 'Code' : 'Deal'}
                </span>
              )}
              {daysLeft !== null && daysLeft <= 7 && (
                <span className="sol-exp">⏰ {daysLeft}d left</span>
              )}
            </>
          )}
        </div>
        <div className="sol-title">{offer.title}</div>
        {(offer.description || defaultDescription) && (
          <p className="sol-desc">{offer.description || defaultDescription}</p>
        )}
        {!expired && offer.usageTips && <p className="sol-desc sol-desc-tip">💡 {offer.usageTips}</p>}
        {!expired && offer.eligibilityNotes && <p className="sol-desc sol-desc-eligibility">ℹ️ {offer.eligibilityNotes}</p>}
        {!expired && (
          <VoteButtons
            offerId={offer.id}
            initialActive={offer.votesActive ?? 0}
            initialExpired={offer.votesExpired ?? 0}
          />
        )}
      </div>

      {/* CTA */}
      <div className="sol-cta">
        {expired ? (
          <span className="sol-expired-note">No longer available — try an active offer above</span>
        ) : hasCode ? (
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
  now,
}: {
  offers: Offer[]
  defaultDescription?: string
  storeName?: string
  affiliateLink?: string
  storeWebsite?: string
  /** Moc thoi gian do server sinh ra luc render trang (xem stores/[slug]/page.tsx).
   *  Bat buoc phai la prop chu khong tu tinh trong component: component nay chay
   *  ca o SSR lan hydrate, neu moi ben tu goi new Date() thi mot offer het han
   *  dung trong khoang giua se bi xep vao 2 nhom khac nhau -> React thay so luong
   *  con khac nhau -> hydration mismatch (nang hon lech chu, vi doi ca cay DOM).
   *  Trang cache ISR 60s nen `now` cham toi da 60 giay — khong anh huong gi voi
   *  do chinh xac theo NGAY. */
  now: number
}) {
  const defaultDescriptions = (defaultDescription ?? '')
    .split('\n')
    .map(s => s.trim().replace(/\{store\}/g, storeName ?? ''))
    .filter(Boolean)
  const destinationUrl = affiliateLink ?? (storeWebsite ? `https://${storeWebsite.replace(/^https?:\/\//, '')}` : '#')
  const [filter, setFilter] = useState<Filter>('all')

  const nowDate = new Date(now)
  const thirtyDaysAgo = new Date(now - 30 * 86400000)
  const active   = offers.filter(o => !o.expiresAt || new Date(o.expiresAt) >= nowDate)
  const recentlyExpired = offers.filter(o => o.expiresAt && new Date(o.expiresAt) < nowDate && new Date(o.expiresAt) >= thirtyDaysAgo)
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
              now={now}
            />
          ))
        )}
      </div>

      {recentlyExpired.length > 0 && (
        <div className="sol-expired-section">
          <div className="sol-expired-title">Recently Expired</div>
          <div className="sol-list">
            {recentlyExpired.map((o, i) => (
              <OfferRow
                key={o.id}
                offer={o}
                defaultDescriptions={defaultDescriptions}
                index={i}
                destinationUrl={destinationUrl}
                storeName={storeName}
                expired
                now={now}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
