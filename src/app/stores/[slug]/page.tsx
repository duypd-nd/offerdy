import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import StoreOfferList from '@/components/StoreOfferList'
import { getStoreBySlug, getOffersByStore, getConfigContent, type HowToStep, type FaqItem } from '@/sanity/queries'
import FaqAccordion from '@/components/FaqAccordion'
import AffiliateLink from '@/components/AffiliateLink'

export const revalidate = 60

// Cho phep Next.js dung ISR (cache + revalidate) cho route dynamic [slug] thay vi
// luon render dong tren moi request - bat buoc phai co ham nay (du tra ve mang rong)
// thi revalidate o tren moi thuc su co hieu luc, dynamicParams mac dinh la true nen
// slug nao chua duoc tao san van duoc render on-demand roi cache lai binh thuong.
export async function generateStaticParams() {
  return []
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: '📱 Electronics', fashion: '👗 Fashion', beauty: '💄 Beauty',
  home: '🏠 Home & Garden', sports: '🏃 Sports', food: '🍕 Food & Health',
  travel: '✈️ Travel', books: '📚 Books', gaming: '🎮 Gaming', general: '🛒 General',
}
const FALLBACK_ABOUT: Record<string, string> = {
  amazon: 'Amazon là một trong những nền tảng mua sắm trực tuyến lớn nhất thế giới với hàng triệu sản phẩm từ điện tử, thời trang, gia dụng đến làm đẹp. Giao hàng nhanh, đổi trả linh hoạt.',
  apple: 'Apple thiết kế và phân phối điện thoại, máy tính, tablet và phụ kiện cao cấp. Nổi tiếng với thiết kế tinh tế và hệ sinh thái liền mạch.',
  nike: 'Nike là thương hiệu thể thao hàng đầu thế giới, chuyên giày dép, quần áo và phụ kiện thể thao. Just Do It.',
  samsung: 'Samsung cung cấp điện thoại thông minh, TV, tủ lạnh và thiết bị gia dụng cao cấp với công nghệ tiên tiến.',
  adidas: 'Adidas — thương hiệu thể thao quốc tế với giày dép, quần áo cho cả vận động viên chuyên nghiệp lẫn người dùng thường ngày.',
  'best-buy': 'Best Buy là nhà bán lẻ điện tử hàng đầu Bắc Mỹ, chuyên điện tử, công nghệ và thiết bị gia dụng.',
}

const BASE = 'https://www.offerdy.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) return {}
  const title = store.metaTitle ?? `${store.name} Deals & Coupons — Offerdy`
  const description = store.metaDescription ?? store.shortDescription ?? `Verified deals and coupon codes for ${store.name}.`
  const url = `${BASE}/stores/${slug}`
  return {
    title,
    description,
    keywords: store.metaKeywords ?? `${store.name} deals, ${store.name} coupon, ${store.name} promo code`,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Offerdy',
      type: 'website',
      images: store.imageUrl ? [{ url: store.imageUrl, alt: store.name }] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: store.imageUrl ? [store.imageUrl] : [],
    },
  }
}

function ExternalIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
    </svg>
  )
}

export default async function StoreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()

  const [offers, globalContent] = await Promise.all([
    getOffersByStore(slug),
    getConfigContent(),
  ])

  const shortDesc = store.shortDescription ?? 'Deals & coupons verified daily — tested before going live.'
  const aboutHtml = store.description ?? FALLBACK_ABOUT[slug] ?? `Shop at ${store.name} and save with our verified deals and coupon codes. Every offer is tested before publishing.`
  const catLabel  = store.category ? CATEGORY_LABELS[store.category] : null
  const upcomingEvents = (store.events ?? []).filter((e: { date?: string }) => !e.date || new Date(e.date) >= new Date())

  const codeCount = offers.filter(o => o.couponCode).length
  const dealCount = offers.filter(o => !o.couponCode).length

  const fill = (s: string) => s.replace(/\{store\}/g, store.name)

  const howToSteps: HowToStep[] = globalContent.howToSteps?.length ? globalContent.howToSteps : [
    { title: 'Find & Copy Your Coupon Code', description: `Find your {store} coupon on this page. Click "GET CODE" to reveal the code, then click "Copy" — the code is automatically saved to your clipboard.` },
    { title: 'Add Items & Go to Checkout', description: `Visit {store}, browse and add all the items you want to your shopping cart. When finished, proceed to the {store} checkout page.` },
    { title: 'Paste Code & Apply Your Savings', description: `At checkout, find the field labeled "Promo Code" or "Discount Code". Paste your code, then click "Apply". Your discount will be deducted from the order total instantly.` },
  ]

  const faqs: FaqItem[] = store.faq?.length ? store.faq : globalContent.defaultFaqs?.length ? globalContent.defaultFaqs : [
    { question: `Does {store} have coupon codes right now?`, answer: `Yes! We currently list ${offers.length} active offer${offers.length !== 1 ? 's' : ''} for {store}. Our team verifies each coupon before publishing so you only see codes that actually work.` },
    { question: `How do I use a {store} coupon code?`, answer: `Copy the code from this page, visit {store}${store.website ? ` (${store.website})` : ''}, add items to your cart, then paste the code in the "Promo Code" or "Discount Code" field at checkout and click Apply.` },
    { question: `Why isn't my {store} coupon code working?`, answer: `Coupon codes may have minimum order requirements, be limited to certain product categories, or be for new customers only. Check the offer details on this page. If a code has expired, try another one from the list above.` },
    { question: `How often are {store} coupons updated?`, answer: `We update our {store} deals daily. New coupons are added as soon as they go live, and expired ones are removed automatically so the list stays fresh.` },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: store.name,
        url: store.website ? (store.website.startsWith('http') ? store.website : `https://${store.website}`) : undefined,
        logo: store.imageUrl ?? undefined,
        description: shortDesc,
      },
      ...(howToSteps.length ? [{
        '@type': 'HowTo',
        name: `How to Use ${store.name} Coupon Codes`,
        description: `Save money at ${store.name} in 3 simple steps.`,
        step: howToSteps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: fill(s.title),
          text: s.description ? fill(s.description) : fill(s.title),
        })),
      }] : []),
      ...(faqs.length ? [{
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: fill(f.question),
          acceptedAnswer: { '@type': 'Answer', text: fill(f.answer) },
        })),
      }] : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Stores', item: `${BASE}/stores` },
          { '@type': 'ListItem', position: 3, name: store.name, item: `${BASE}/stores/${slug}` },
        ],
      },
    ],
  }

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>

        {/* ── BREADCRUMB ───────────────────────────────────────── */}
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <Link href="/stores" className="sol-crumb-back">Stores</Link>
            <span className="sol-crumb-sep">/</span>
            {catLabel && <><span className="sol-crumb-cat">{catLabel}</span><span className="sol-crumb-sep">/</span></>}
            <span className="sol-crumb-cur">{store.name}</span>
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ────────────────────────────────── */}
        <div className="sol-layout">

          {/* Sidebar */}
          <aside className="sol-sidebar">
            {/* Logo + name */}
            <div className="sol-sb-top">
              {store.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.imageUrl} alt={store.name} className="sol-sb-img" />
              ) : (
                <div className={`sol-sb-badge sa ${store.colorClass}`}>{store.abbr}</div>
              )}
              <div className="sol-sb-name">{store.name}</div>
              {store.website && (
                <AffiliateLink
                  href={store.affiliateLink ?? `https://${store.website}`}
                  storeName={store.name}
                  storeId={store.id}
                  className="sol-sb-web-link"
                >
                  🌐 {store.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </AffiliateLink>
              )}
              {catLabel && <div className="sol-sb-cat">{catLabel}</div>}
              <div className="sol-sb-verified"><ShieldIcon /> Verified Store</div>
              <div className="sol-sb-stars">
                {'★★★★★'.split('').map((s, i) => <span key={i} className={`sol-star${i < 4 ? '' : ' sol-star-half'}`}>{s}</span>)}
                <span className="sol-star-label">4.8 / 5</span>
              </div>
            </div>

            {/* Alert button */}
            <div className="sol-sb-mid">
              <button className="sol-sb-alert"><BellIcon /> Get Coupon Alert</button>
            </div>

            {/* Stats */}
            <div className="sol-sb-stats">
              <div className="sol-sb-stats-title">{offers.length} Active Offer{offers.length !== 1 ? 's' : ''}</div>
              <div className="sol-sb-stat-row"><span>Coupon Codes</span><strong>{codeCount}</strong></div>
              <div className="sol-sb-stat-row"><span>Deals</span><strong>{dealCount}</strong></div>
              {store.maxOffer && (
                <div className="sol-sb-stat-row">
                  <span>Best Offer</span>
                  <strong className="sol-sb-best">Up to {store.maxOffer}% Off</strong>
                </div>
              )}
            </div>

          </aside>

          {/* Main */}
          <div className="sol-main">
            <h1 className="sol-heading">{store.name} Coupons and Promo Codes</h1>
            <p className="sol-sub">{shortDesc}</p>

            {offers.length > 0 ? (
              <StoreOfferList offers={offers} defaultDescription={globalContent.defaultOfferDescription} storeName={store.name} affiliateLink={store.affiliateLink} storeWebsite={store.website} />
            ) : (
              <div className="store-empty">
                <div className="store-empty-icon">🏷️</div>
                <div className="store-empty-title">Chưa có offer nào cho {store.name}</div>
                <div className="store-empty-sub">Check back soon — we add new offers daily.</div>
              </div>
            )}

            {/* Events */}
            {upcomingEvents.length > 0 && (
              <div className="sol-events">
                <div className="sol-events-title">📅 Upcoming Events</div>
                <div className="store-events-grid">
                  {upcomingEvents.map((ev: { title: string; date?: string; description?: string; discount?: number; link?: string }, i: number) => (
                    <div key={i} className="store-event-card">
                      <div className="store-event-head">
                        <span className="store-event-disc">
                          {ev.discount ? `Up to ${ev.discount}% off` : '🎉 Event'}
                        </span>
                        {ev.date && (
                          <span className="store-event-date">
                            {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div className="store-event-title">{ev.title}</div>
                      {ev.description && <div className="store-event-desc">{ev.description}</div>}
                      {ev.link && (
                        <AffiliateLink href={ev.link} storeName={store.name} storeId={store.id} className="store-event-link">
                          Xem chi tiết <ExternalIcon size={11} />
                        </AffiliateLink>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="sol-about">
              <h2 className="sol-about-title">About {store.name}</h2>
              <div className="sol-about-body" dangerouslySetInnerHTML={{ __html: aboutHtml }} />
            </div>

            {/* Pros & Cons */}
            {(store.prosAndCons?.pros?.length || store.prosAndCons?.cons?.length) && (
              <div className="sol-proscons">
                <h2 className="sol-about-title">Pros &amp; Cons</h2>
                <div className="sol-proscons-grid">
                  {store.prosAndCons?.pros?.length ? (
                    <div className="sol-proscons-card sol-proscons-pros">
                      <div className="sol-proscons-label">Pros</div>
                      <ul>{store.prosAndCons.pros.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  ) : null}
                  {store.prosAndCons?.cons?.length ? (
                    <div className="sol-proscons-card sol-proscons-cons">
                      <div className="sol-proscons-label">Cons</div>
                      <ul>{store.prosAndCons.cons.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* How-to guide */}
            <div className="sol-howto">
              <div className="sol-howto-label">QUICK GUIDE</div>
              <h2 className="sol-howto-title">How to Apply <em>{store.name}</em> Coupon Codes</h2>
              <p className="sol-howto-sub">Save money in 3 simple steps — takes less than 60 seconds.</p>
              <div className="sol-howto-steps">
                {howToSteps.map((step, i) => (
                  <div key={i} className="sol-howto-wrap">
                    <div className="sol-howto-step">
                      <div className="sol-howto-num">{i + 1}</div>
                      <div className="sol-howto-body">
                        <div className="sol-howto-badge">STEP {i + 1}</div>
                        <div className="sol-howto-step-title">{fill(step.title)}</div>
                        {step.description && <p className="sol-howto-desc" dangerouslySetInnerHTML={{ __html: fill(step.description) }} />}
                      </div>
                    </div>
                    {i < howToSteps.length - 1 && <div className="sol-howto-line" />}
                  </div>
                ))}
                <div className="sol-howto-tip">
                  <span className="sol-howto-tip-ico">💡</span>
                  <div>
                    <div className="sol-howto-tip-title">Pro Tip</div>
                    <p className="sol-howto-tip-text">Can&apos;t find the promo code field? Try looking in the <strong>order summary sidebar</strong>, or check if it appears after entering your shipping address. Some stores show it as a collapsible <em>&quot;Have a coupon?&quot;</em> link.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="sol-faq">
              <h2 className="sol-faq-title">Frequently Asked Questions</h2>
              <FaqAccordion faqs={faqs} storeName={store.name} />
            </div>

            {/* Disclaimer */}
            {(globalContent.articleDisclaimer || globalContent.articleReviewedBy) && (
              <div className="article-disclaimer">
                {globalContent.articleDisclaimer && (
                  <p dangerouslySetInnerHTML={{ __html: globalContent.articleDisclaimer.replace(/\{site\}/g, 'Offerdy').replace(/\{store\}/g, `<span style="color:#16a34a;font-weight:700">${store.name}</span>`) }} />
                )}
                {globalContent.articleReviewedBy && (
                  <p className="article-disclaimer-meta">Reviewed by the {globalContent.articleReviewedBy}.</p>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}
