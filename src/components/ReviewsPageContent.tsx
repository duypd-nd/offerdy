'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Review } from '@/data/reviews'

const PAGE_SIZE = 20

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Reviews', value: 'Review' },
  { label: 'Comparisons', value: 'Comparison' },
]

function Pagination({ page, totalPages, goTo }: { page: number; totalPages: number; goTo: (p: number) => void }) {
  return (
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
            ? <span key={`e-${i}`} className="dpag-ellipsis">…</span>
            : <button key={p} className={`dpag-btn${page === p ? ' dpag-active' : ''}`} onClick={() => goTo(p as number)}>{p}</button>
        )
      }
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(page + 1)} disabled={page === totalPages}>›</button>
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(totalPages)} disabled={page === totalPages}>»</button>
    </div>
  )
}

export default function ReviewsPageContent({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = active === 'all' ? reviews : reviews.filter(r => r.tag === active)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goTo = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const switchTab = (val: string) => {
    setActive(val)
    setPage(1)
  }

  return (
    <>
      <div className="filter-bar">
        {TABS.map(tab => (
          <button
            key={tab.value}
            className={`filter-chip${active === tab.value ? ' active' : ''}`}
            onClick={() => switchTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="reviews-section" style={{ paddingTop: 24 }}>
        <div className="reviews-section-inner">
          <div className="section-header">
            <div>
              <div className="section-title">{active === 'all' ? 'All Articles' : `${active}s`}</div>
              <div className="section-sub">
                {filtered.length} articles · In-depth, real-world tested
                {totalPages > 1 && ` · Trang ${page}/${totalPages}`}
              </div>
            </div>
          </div>

          <div className="reviews-grid">
            {paginated.map(review => (
              <div key={review.id} className="review-card">
                <Link href={`/reviews/${review.slug}`} className="review-img" style={{ background: review.imageUrl ? undefined : review.imgBg }}>
                  {review.imageUrl
                    ? <Image src={review.imageUrl} alt={review.title} fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} />
                    : review.emoji
                  }
                  <span className="review-tag">{review.tag}</span>
                </Link>
                <div className="review-body">
                  <div className="review-meta">
                    <div className="stars">
                      {'★'.repeat(review.stars)}
                      {review.stars < 5 && (
                        <span style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - review.stars)}</span>
                      )}
                    </div>
                    <div className="review-date">{review.date}</div>
                  </div>
                  <div className="review-title">{review.title}</div>
                  <div className="review-excerpt">{review.excerpt}</div>
                  <Link href={`/reviews/${review.slug}`} className="review-link">Read full review →</Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              No posts in this category yet.
            </p>
          )}

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} goTo={goTo} />}
        </div>
      </section>
    </>
  )
}
