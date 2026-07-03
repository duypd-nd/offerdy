import Link from 'next/link'
import type { Review } from '@/data/reviews'

export default function ReviewsGrid({ reviews, columns }: { reviews: Review[]; columns?: number }) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns ?? 4}, 1fr)` }
  return (
    <section className="reviews-section">
      <div className="reviews-section-inner">
        <div className="section-header">
          <div>
            <div className="section-title">Reviews &amp; Comparisons</div>
            <div className="section-sub">In-depth analysis, real-world tested</div>
          </div>
          <Link href="/reviews" className="see-all">All articles →</Link>
        </div>
        <div className="reviews-grid" style={gridStyle}>
          {reviews.map(review => (
            <div key={review.id} className="review-card">
              <Link href={`/reviews/${review.slug}`} className="review-img" style={{ background: review.imageUrl ? undefined : review.imgBg }}>
                {review.imageUrl
                  ? <img src={review.imageUrl} alt={review.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
      </div>
    </section>
  )
}
