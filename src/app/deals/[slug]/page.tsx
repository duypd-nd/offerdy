import { notFound } from 'next/navigation'
import { fillSiteName } from '@/lib/siteNameToken'
import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import AffiliateLink from '@/components/AffiliateLink'
import FaqAccordion from '@/components/FaqAccordion'
import ShareDeal from '@/components/ShareDeal'
import { getSiteName, getDealBySlug, getConfigContent, getDealCoupon } from '@/sanity/queries'
import ReviewCouponBox from '@/components/ReviewCouponBox'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import { parsePrice } from '@/lib/dealSchema'
import { formatDealCode } from '@/lib/dealCode'

export const revalidate = 60

// Bat buoc phai co ham nay (du tra ve mang rong) thi revalidate o tren moi
// thuc su co hieu luc voi route dynamic [slug] - xem stores/[slug]/page.tsx
export async function generateStaticParams() {
  return []
}

const BASE = 'https://www.offerdy.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [deal, siteName] = await Promise.all([getDealBySlug(slug), getSiteName()])
  if (!deal) return {}
  const title = deal.metaTitle || `${deal.title} — ${dealDiscountBadge(deal).main} Off`
  // `store` co the rong (21/21 deal hien tai deu rong du schema danh dau required —
  // du lieu import qua API khong bi Sanity validation chan). Khong guard thi meta
  // description ra "... at null: sale price ..." — dung dong Google hien thi va dung
  // dong hien trong the preview khi dan link len mang xa hoi.
  const description = deal.metaDescription || deal.summary
    || `${deal.title}${deal.store ? ` at ${deal.store}` : ''}: sale price ${deal.priceSale}, was ${deal.priceOrig}.`
  const url = `${BASE}/deals/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: 'website',
      // KHONG set images o day — de opengraph-image.tsx cung thu muc lo. Set tuong
      // minh se ghi de route do (da kiem chung tren production), khien preview quay
      // ve anh Sanity tho, mat gia + % giam trong the.
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export default async function DealDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [deal, globalContent, siteName] = await Promise.all([
    getDealBySlug(slug),
    getConfigContent(),
    getSiteName(),
  ])
  if (!deal) notFound()

  // Ma coupon that cua shop ma deal nay dan toi, khop qua domain cua dealUrl.
  // Goi SAU khi da co deal (can dealUrl) nen khong gop vao Promise.all tren.
  const coupon = await getDealCoupon(deal.dealUrl)

  const badge = dealDiscountBadge(deal)
  // Server component: chi chay luc build/revalidate (60s), khong hydrate nen
  // khong co nguy co mismatch. Rule react-hooks/purity khong phan biet duoc
  // server voi client component nen bao nham o day.
  const daysLeft = deal.expiresAt
    // eslint-disable-next-line react-hooks/purity
    ? Math.ceil((new Date(deal.expiresAt).getTime() - Date.now()) / 86400000)
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: deal.title,
        image: deal.imageUrl ?? undefined,
        brand: deal.store ? { '@type': 'Brand', name: deal.store } : undefined,
        url: `${BASE}/deals/${slug}`,
        description: deal.summary ?? undefined,
        offers: {
          '@type': 'Offer',
          url: `${BASE}/deals/${slug}`,
          // ⚠️ Ca hai dong nay deu tung sai: `parseFloat` sau khi vut dau phay doc
          // "€199,99" thanh 19999, con `priceCurrency` thi dong dinh USD du chinh
          // chuoi gia mang ky hieu €. Khai lech gia thi rich-result bi loai.
          priceCurrency: parsePrice(deal.priceSale)?.currency ?? 'USD',
          price: parsePrice(deal.priceSale)?.amount,
          availability: 'https://schema.org/InStock',
          priceValidUntil: deal.expiresAt ?? undefined,
        },
      },
      ...(deal.faq?.length ? [{
        '@type': 'FAQPage',
        mainEntity: deal.faq.map((f: { question: string; answer: string }) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }] : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Deals', item: `${BASE}/deals` },
          { '@type': 'ListItem', position: 3, name: deal.title, item: `${BASE}/deals/${slug}` },
        ],
      },
    ],
  }

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <Link href="/deals" className="sol-crumb-back">Deals</Link>
            <span className="sol-crumb-sep">/</span>
            <span className="sol-crumb-cur">{deal.title}</span>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
          <div className="dd-hero">
            <div className="dd-media">
              {deal.imageUrl
                // eslint-disable-next-line @next/next/no-img-element -- giu ty le anh goc
                ? <img src={deal.imageUrl} alt={deal.title} />
                : (deal.emoji ?? '🏷️')
              }
            </div>
            <div className="dd-info">
              {/* Ma san pham: khach den tu caption "#1005" can thay dung so do de
                  biet minh khong vao lam trang. `store` rong o toan bo 21 deal hien
                  tai nen dong nay thuong chi con ma. */}
              {(deal.store || deal.code) && (
                <div className="dd-store">
                  {/* Ten shop thanh LINK khi khop duoc store (suy tu domain cua
                      dealUrl). Khach dang xem mot san pham thi trang store la noi
                      co TAT CA ma cua shop do — truoc day day chi la chu thuong,
                      va hai nhom noi dung nay khong he noi voi nhau. */}
                  {deal.store && deal.storeSlug
                    ? <Link href={`/stores/${deal.storeSlug}`} className="dd-store-link">{deal.store}</Link>
                    : deal.store}
                  {deal.store && deal.code ? ' · ' : ''}
                  {deal.code && <span className="dd-code">{formatDealCode(deal.code)}</span>}
                </div>
              )}
              <h1 className="dd-title">{deal.title}</h1>
              <div className="dd-prices">
                <span className="dd-now">{deal.priceSale}</span>
                {deal.priceOrig && <span className="dd-was">{deal.priceOrig}</span>}
                <span className="dd-badge">{badge.main}{badge.sub ? ` ${badge.sub}` : ''}</span>
              </div>
              {daysLeft !== null && daysLeft >= 0 && (
                <div className="dd-expiry">
                  ⏰ {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                </div>
              )}
              {/* dealId: truoc day nut nay khong duoc dem gi ca (deal khong co
                  reference toi store/offer nen khong co id nao de truyen) — moi
                  luot bam ra merchant tu trang deal bi mat trang. */}
              <AffiliateLink href={deal.dealUrl ?? '/deals'} storeName={deal.store} dealId={deal.id} className="dd-cta">
                Get Deal →
              </AffiliateLink>
              <ShareDeal code={deal.code} slug={slug} title={deal.title} />
            </div>
          </div>

          {/* Ma coupon cua shop. Loi van noi dung muc do biet: day la ma toan
              shop, khong phai ma rieng cho san pham nay — xem ReviewCouponBox. */}
          {coupon && (
            <div style={{ marginBottom: 28 }}>
              <ReviewCouponBox
                siteName={siteName}
                code={coupon.code}
                link={deal.dealUrl}
                eyebrow={<>Active code at <span className="rv-coupon-brand">{coupon.storeName}</span></>}
                heading={coupon.offerText || `${coupon.storeName} has a working discount code`}
                sub="This is a store-wide code, not tied to this particular product — worth trying at checkout."
                note={`Apply ${coupon.code} at checkout. Store-wide code, so some items may be excluded.`}
              />
            </div>
          )}

          {deal.relatedReview && (
            <Link
              href={`/reviews/${deal.relatedReview.slug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '14px 18px',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
                textDecoration: 'none', color: '#15803d',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Read our full review of {deal.relatedReview.title} <span aria-hidden>→</span>
              </span>
            </Link>
          )}

          {deal.summary && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Why This Deal Is Worth It</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>{deal.summary}</p>
            </div>
          )}

          {(deal.prosAndCons?.pros?.length || deal.prosAndCons?.cons?.length) && (
            <div className="sol-proscons" style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Pros &amp; Cons</h2>
              <div className="sol-proscons-grid">
                {deal.prosAndCons?.pros?.length ? (
                  <div className="sol-proscons-card sol-proscons-pros">
                    <div className="sol-proscons-label">Pros</div>
                    <ul>{deal.prosAndCons.pros.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
                  </div>
                ) : null}
                {deal.prosAndCons?.cons?.length ? (
                  <div className="sol-proscons-card sol-proscons-cons">
                    <div className="sol-proscons-label">Cons</div>
                    <ul>{deal.prosAndCons.cons.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {deal.faq?.length > 0 && (
            <div className="sol-faq">
              <h2 className="sol-faq-title">Frequently Asked Questions</h2>
              <FaqAccordion faqs={deal.faq} storeName={deal.store ?? ''} />
            </div>
          )}

          {(globalContent.articleDisclaimer || globalContent.articleReviewedBy) && (
            <div className="article-disclaimer">
              {globalContent.articleDisclaimer && (
                <p dangerouslySetInnerHTML={{ __html: globalContent.articleDisclaimer.replace(/\{site\}/g, siteName).replace(/\{store\}/g, deal.store ? `<span style="color:#16a34a;font-weight:700">${deal.store}</span>` : 'the store') }} />
              )}
              {globalContent.articleReviewedBy && (
                <p className="article-disclaimer-meta">
                  {(deal._updatedAt || deal._createdAt) && `Last updated: ${fmtDate(deal._updatedAt ?? deal._createdAt)} · `}{fillSiteName(globalContent.articleReviewedBy, siteName)}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
