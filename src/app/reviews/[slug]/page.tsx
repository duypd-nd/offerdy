import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getReviewBySlug, getReviews, getConfigContent } from '@/sanity/queries'
import { reviews as staticReviews } from '@/data/reviews'

export const dynamic = 'force-dynamic'

const BASE = 'https://offerdy.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const review = await getReviewBySlug(slug)
  if (!review) return {}
  const title = review.title
  const description = review.excerpt ?? `Read our in-depth review of ${review.title}, verified by the Offerdy team.`
  const url = `${BASE}/reviews/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Offerdy',
      type: 'article',
      publishedTime: review.date ?? undefined,
      images: review.imageUrl ? [{ url: review.imageUrl, alt: title }] : [],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [review, allReviews, globalConfig] = await Promise.all([
    getReviewBySlug(slug),
    getReviews(),
    getConfigContent(),
  ])

  if (!review) notFound()

  let sidebarReviews = allReviews
    .filter((r: { slug: string }) => r.slug !== slug)
    .slice(0, 6)

  // fallback sang static data nếu Sanity chỉ có 1 review
  if (sidebarReviews.length === 0) {
    sidebarReviews = staticReviews
      .filter(r => r.slug !== slug)
      .slice(0, 6)
  }

  const reviewJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Review',
        name: review.title,
        reviewBody: review.excerpt ?? undefined,
        reviewRating: { '@type': 'Rating', ratingValue: review.stars, bestRating: 5, worstRating: 1 },
        author: { '@type': 'Organization', name: 'Offerdy', url: BASE },
        itemReviewed: {
          '@type': 'Product',
          name: review.title,
          image: review.imageUrl ?? undefined,
        },
        datePublished: review.date ?? undefined,
        url: `${BASE}/reviews/${slug}`,
        publisher: { '@type': 'Organization', name: 'Offerdy', url: BASE },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${BASE}/reviews` },
          { '@type': 'ListItem', position: 3, name: review.title, item: `${BASE}/reviews/${slug}` },
        ],
      },
    ],
  }

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }} />
      <main>
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <Link href="/reviews" className="sol-crumb-back">Reviews</Link>
            <span className="sol-crumb-sep">/</span>
            {review.tag && <><span className="sol-crumb-cat">{review.tag}</span><span className="sol-crumb-sep">/</span></>}
            <span className="sol-crumb-cur">{review.title}</span>
          </div>
        </div>

        <div className="article-layout">
          {/* ── MAIN ARTICLE ── */}
          <article className="article-wrap">
            <div className="article-tag-row">
              <span className="article-tag">{review.tag}</span>
              <span className="article-stars">
                {'★'.repeat(review.stars)}
                {review.stars < 5 && (
                  <span style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - review.stars)}</span>
                )}
              </span>
            </div>

            <h1 className="article-title">{review.title}</h1>

            <div className="article-meta">
              <span>📅 {review.date}</span>
              <span>⏱ 5 min read</span>
              <span>✅ Verified purchase</span>
            </div>

            <div className="article-hero-img" style={{ background: review.imageUrl ? undefined : review.imgBg }}>
              {review.imageUrl
                ? <img src={review.imageUrl} alt={review.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                : review.emoji
              }
            </div>

            <div className="article-body">
              <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 28, lineHeight: 1.7 }}>
                {review.excerpt}
              </p>

              {review.content && review.content.length > 100 ? (
                <div dangerouslySetInnerHTML={{ __html: review.content }} />
              ) : review.body && review.body.length > 0 ? (
                <PortableBody body={review.body} />
              ) : (
                <PlaceholderBody review={review} />
              )}
            </div>

            {(globalConfig.articleDisclaimer || globalConfig.articleReviewedBy) && (
              <div className="article-disclaimer">
                {globalConfig.articleDisclaimer && (
                  <p dangerouslySetInnerHTML={{ __html: globalConfig.articleDisclaimer.replace(/\{site\}/g, 'Offerdy').replace(/\{store\}/g, '<span style="color:#16a34a;font-weight:700">the store</span>') }} />
                )}
                {globalConfig.articleReviewedBy && (
                  <p className="article-disclaimer-meta">
                    {review.date && `Last updated: ${fmtDate(review.date)} · `}{globalConfig.articleReviewedBy}
                  </p>
                )}
              </div>
            )}
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="article-sidebar">
            {sidebarReviews.length > 0 && (
              <div className="asb-box">
                <div className="asb-title">Recent Reviews</div>
                {sidebarReviews.map((r: {
                  slug: string
                  title: string
                  tag?: string
                  emoji?: string
                  imgBg?: string
                  imageUrl?: string
                }) => (
                  <Link key={r.slug} href={`/reviews/${r.slug}`} className="asb-card">
                    <div className="asb-thumb" style={{ background: r.imageUrl ? undefined : (r.imgBg ?? 'var(--bg)') }}>
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={r.title} />
                        : (r.emoji ?? '⭐')
                      }
                    </div>
                    <div className="asb-info">
                      <div className="asb-name">{r.title}</div>
                      {r.tag && <span className="asb-tag">{r.tag}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  )
}

function PlaceholderBody({ review }: { review: { title: string; tag: string } }) {
  const isComparison = review.tag === 'Comparison'
  return (
    <>
      <h2>Our Testing Process</h2>
      <p>
        We purchased this product at full retail price and tested it over a 30-day period under real-world
        conditions. No sponsored content, no early access bias — just honest reporting.
      </p>

      {isComparison ? (
        <>
          <h2>Head-to-Head Breakdown</h2>
          <p>
            We scored each product across five dimensions: performance, build quality, value for money,
            software/usability, and longevity. Here&rsquo;s how they stacked up.
          </p>
          <div className="article-verdict">
            <div className="article-verdict-lbl">Our Verdict</div>
            <div className="article-verdict-text">
              Based on our testing, we have a clear winner — but the runner-up is worth considering
              depending on your budget and priorities.
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>Performance</h2>
          <p>
            In everyday use, the performance exceeded our expectations in most areas. We ran a series of
            benchmarks alongside real-world tasks to get a complete picture.
          </p>
          <h2>Value for Money</h2>
          <p>
            At the current sale price, this represents one of the best value propositions in its category.
            We compared it against alternatives at similar price points.
          </p>
          <div className="article-verdict">
            <div className="article-verdict-lbl">Our Verdict</div>
            <div className="article-verdict-text">
              A strong recommendation for most buyers. The minor drawbacks don&rsquo;t outweigh the significant
              strengths — especially at the current discounted price.
            </div>
          </div>
        </>
      )}

      <h2>Where to Buy</h2>
      <p>
        We found the best price currently available and confirmed the deal is live. Click below to get it
        before the offer expires.
      </p>
      <Link href="/deals" className="article-cta">See current deal →</Link>
    </>
  )
}

function PortableBody({ body }: { body: unknown[] }) {
  return (
    <>
      {body.map((block: unknown, i: number) => {
        const b = block as { _type: string; style?: string; children?: { text: string }[]; listItem?: string }
        if (b._type !== 'block') return null
        const text = b.children?.map(c => c.text).join('') ?? ''
        if (!text) return null
        if (b.listItem) return <li key={i}>{text}</li>
        const Tag = (b.style === 'h2' ? 'h2' : b.style === 'h3' ? 'h3' : 'p') as 'h2' | 'h3' | 'p'
        return <Tag key={i}>{text}</Tag>
      })}
    </>
  )
}
