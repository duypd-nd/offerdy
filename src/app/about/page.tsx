import type { Metadata } from 'next'
import Link from 'next/link'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { writeClient } from '@/sanity/writeClient'
import { isConfigured } from '@/sanity/client'
import { getPublishedStoreCount, getSiteName } from '@/sanity/queries'
import { fillStoreCount } from '@/lib/storeCount'
import { fillSiteName } from '@/lib/siteNameToken'

export const dynamic = 'force-dynamic'

const BASE = 'https://www.offerdy.com'

type Stat     = { _key: string; num: string; label: string }
type Step     = { _key: string; title: string; desc: string }
type Category = { _key: string; title: string; desc: string }

type AboutData = {
  h1?: string; heroLead?: string
  storyQuote?: string; storyBody?: string
  founderName?: string; foundingYear?: string
  stats?: Stat[]
  verifyHeading?: string; verifyLead?: string; steps?: Step[]
  coverageHeading?: string; categories?: Category[]
  promiseTitle?: string; promiseBody?: string
  seoTitle?: string; seoDescription?: string
  showStory?: boolean; showStats?: boolean; showCoverage?: boolean; indexPage?: boolean
}

const DEFAULTS: Required<AboutData> = {
  h1: 'Verified coupon codes you can actually use',
  heroLead: '{site} is a free deals platform covering {storeCount} stores worldwide. Every promo code and discount code listed here is tested before it goes live — so you never hit "Invalid code" at checkout.',
  storyQuote: '"I had a full cart, found a discount code online, typed it in — and got an error. The code had expired two weeks earlier. Nobody told me."',
  storyBody: "That moment is the entire reason {site} exists. Most coupon sites aggregate codes from anywhere and publish them without ever checking if they work. We do things differently. Every code you see here has been tested against a real store checkout. If it fails, it doesn't go live — full stop.",
  founderName: 'The {site} Team',
  foundingYear: '2026',
  stats: [
    { _key: 's1', num: '{storeCount}', label: 'Stores worldwide' },
    { _key: 's2', num: '100%', label: 'Codes verified before publishing' },
    { _key: 's3', num: '$0',   label: 'Cost to use — forever free' },
  ],
  verifyHeading: 'How every coupon code gets verified',
  verifyLead: "Posting an unverified code is easy. We don't do it. Here's the exact process every deal goes through before it reaches you.",
  steps: [
    { _key: 'v1', title: 'We source the deal directly',    desc: 'Codes come from store newsletters, affiliate partners, and official promotions — not scraped from random forums or Reddit threads.' },
    { _key: 'v2', title: 'We test it at a real checkout',  desc: "Every code is entered into the actual store checkout before we publish it. If it returns an error or gives less than advertised, it doesn't go live." },
    { _key: 'v3', title: 'We remove expired codes fast',   desc: "Active codes are rechecked regularly. When a deal expires, it's removed — not left to quietly fail on shoppers at the worst moment." },
  ],
  coverageHeading: '{storeCount} stores from around the world',
  categories: [
    { _key: 'c1', title: 'Fashion & Apparel', desc: 'VisoOne Eyewear, Apollo Moda, Estarer, Cottagecore Clothes, Savransky Private Jeweler and other independent brands — clothing, footwear, eyewear and jewellery.' },
    { _key: 'c2', title: 'Home & Living', desc: 'Frizzlife, SleepBamboo, Cocon de Lune, LightStyl, Vonluce and more — water filtration, bedding, lighting and furniture.' },
    { _key: 'c3', title: 'Electronics & Gadgets', desc: 'Redodo Power, Carlinkit CarPlay Store, Ohmmu, Bodegacooler, WoWGadgets99 — batteries, car tech, appliances and accessories.' },
    { _key: 'c4', title: 'Beauty & Personal Care', desc: 'The Cosmetics Fridge, Consistentderma, Skinhubbeauty, CLAWSIE Nails, Tennail — skincare, nails and beauty storage.' },
  ],
  promiseTitle: 'No expired codes. No surprises at checkout.',
  promiseBody: "If a code on {site} doesn't work, we want to know immediately. Every deal listed is one we'd use ourselves. {site} will always be free for shoppers — we earn a small affiliate commission when you buy, at no extra cost to you, ever.",
  seoTitle: 'About {site} — How We Verify Every Coupon',
  seoDescription: '{site} was built because expired coupon codes are frustrating. Every promo code and discount code on {site} is verified before going live — free for shoppers worldwide.',
  showStory: true, showStats: true, showCoverage: true, indexPage: true,
}

function fill<T>(val: T | undefined, fallback: T): T {
  return (val !== undefined && val !== null && (typeof val !== 'string' || val !== '')) ? val : fallback
}

async function getAbout(): Promise<Required<AboutData>> {
  if (!isConfigured()) return DEFAULTS
  try {
    const doc: AboutData = await writeClient.fetch(`*[_id == "configAbout"][0]`) ?? {}
    return {
      h1:              fill(doc.h1,              DEFAULTS.h1),
      heroLead:        fill(doc.heroLead,        DEFAULTS.heroLead),
      storyQuote:      fill(doc.storyQuote,      DEFAULTS.storyQuote),
      storyBody:       fill(doc.storyBody,       DEFAULTS.storyBody),
      founderName:     fill(doc.founderName,     DEFAULTS.founderName),
      foundingYear:    fill(doc.foundingYear,    DEFAULTS.foundingYear),
      stats:           doc.stats?.length         ? doc.stats        : DEFAULTS.stats,
      verifyHeading:   fill(doc.verifyHeading,   DEFAULTS.verifyHeading),
      verifyLead:      fill(doc.verifyLead,      DEFAULTS.verifyLead),
      steps:           doc.steps?.length         ? doc.steps        : DEFAULTS.steps,
      coverageHeading: fill(doc.coverageHeading, DEFAULTS.coverageHeading),
      categories:      doc.categories?.length    ? doc.categories   : DEFAULTS.categories,
      promiseTitle:    fill(doc.promiseTitle,     DEFAULTS.promiseTitle),
      promiseBody:     fill(doc.promiseBody,      DEFAULTS.promiseBody),
      seoTitle:        fill(doc.seoTitle,        DEFAULTS.seoTitle),
      seoDescription:  fill(doc.seoDescription,  DEFAULTS.seoDescription),
      showStory:       doc.showStory   !== false,
      showStats:       doc.showStats   !== false,
      showCoverage:    doc.showCoverage !== false,
      indexPage:       doc.indexPage   !== false,
    }
  } catch {
    return DEFAULTS
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const [d, siteName] = await Promise.all([getAbout(), getSiteName()])
  const seoTitle = fillSiteName(d.seoTitle, siteName)
  const seoDescription = fillSiteName(d.seoDescription, siteName)
  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: `${BASE}/about` },
    robots: d.indexPage ? undefined : { index: false },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: `${BASE}/about`,
      type: 'website',
    },
  }
}

export default async function AboutPage() {
  // So store lay TU DU LIEU, khong go tay — xem src/lib/storeCount.ts de biet vi sao.
  const [d, storeCount, siteName] = await Promise.all([getAbout(), getPublishedStoreCount(), getSiteName()])
  // Mot ham cho CA HAI o: van ban chi viet `{storeCount}` va `{site}`, con so
  // that va ten that duoc dien luc render. Xem lib/storeCount.ts va lib/siteNameToken.ts.
  const n = (t: string) => fillSiteName(fillStoreCount(t, storeCount), siteName)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: siteName,
        url: BASE,
        foundingDate: d.foundingYear,
        description: n(d.seoDescription),
      },
      {
        '@type': 'WebPage',
        '@id': `${BASE}/about#webpage`,
        url: `${BASE}/about`,
        name: n(d.seoTitle),
        description: n(d.seoDescription),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: `Are coupon codes on ${siteName} verified?`, acceptedAnswer: { '@type': 'Answer', text: `Yes. Every coupon code on ${siteName} is tested at a real store checkout before it is published.` } },
          { '@type': 'Question', name: `Is ${siteName} free to use?`, acceptedAnswer: { '@type': 'Answer', text: `${siteName} is completely free for shoppers. We earn a small affiliate commission when you buy through our links.` } },
          { '@type': 'Question', name: `How many stores does ${siteName} cover?`, acceptedAnswer: { '@type': 'Answer', text: `${siteName} covers ${storeCount} stores worldwide, including fashion, electronics, travel, food delivery, and more.` } },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 96px' }}>

          {/* Hero */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            About {siteName}
          </div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-.8px', textWrap: 'balance', marginBottom: 16, maxWidth: 620 }}>
            {n(d.h1)}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.72, maxWidth: 560, marginBottom: 48 }}>
            {n(d.heroLead)}
          </p>

          {/* Story */}
          {d.showStory && (
            <div style={{ background: 'var(--navy)', borderRadius: 18, padding: 'clamp(28px,5vw,40px) clamp(24px,5vw,44px)', marginBottom: 44, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 16 }}>Why we built this</div>
              <blockquote style={{ fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.5, marginBottom: 18 }}>{n(d.storyQuote)}</blockquote>
              <p style={{ fontSize: 15, color: '#7A8BA8', lineHeight: 1.8, marginBottom: 26 }}>{n(d.storyBody)}</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '1.5px solid rgba(34,197,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--green)', flexShrink: 0 }}>{siteName.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{n(d.founderName)}</div>
                  <div style={{ fontSize: 12, color: '#5A6880' }}>Founded {d.foundingYear} · Independent &amp; solo-run</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {d.showStats && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.stats.length},1fr)`, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 52, boxShadow: '0 2px 8px rgba(15,25,41,.04)' }}>
              {d.stats.map((s, i) => (
                <div key={s._key} style={{ padding: '28px 20px', textAlign: 'center', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--green-dark)', lineHeight: 1, letterSpacing: '-2px', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{n(s.num)}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Verify steps */}
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', textWrap: 'balance', marginBottom: 10 }}>{n(d.verifyHeading)}</h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 22 }}>{n(d.verifyLead)}</p>
            <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,25,41,.04)' }}>
              {d.steps.map((s, i) => (
                <div key={s._key} style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: '22px 28px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-50)', border: '1.5px solid #BBF7D0', color: 'var(--green-dark)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{s.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.62 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Coverage */}
          {d.showCoverage && (
            <section style={{ marginBottom: 52 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', textWrap: 'balance', marginBottom: 10 }}>{n(d.coverageHeading)}</h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 22 }}>
                From global household names to niche international retailers.{' '}
                <Link href="/stores" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>Browse all stores →</Link>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
                {d.categories.map(c => (
                  <div key={c._key} style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,25,41,.04)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{c.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.62 }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Promise */}
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', textWrap: 'balance', marginBottom: 20 }}>Our promise to shoppers</h2>
            <div style={{ background: 'var(--green-50)', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '30px 34px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 46, height: 46, background: 'var(--green-dark)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-dark)', marginBottom: 8 }}>{n(d.promiseTitle)}</div>
                <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.72 }}>{n(d.promiseBody)}</p>
                <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Link href="/deals"   style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>Browse active deals →</Link>
                  <Link href="/stores"  style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>Explore all {storeCount} stores →</Link>
                  <Link href="/reviews" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>Read store reviews →</Link>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/deals" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 22px', borderRadius: 9, textDecoration: 'none' }}>Browse Deals</Link>
            <Link href="/stores" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9, border: '1.5px solid var(--border)', textDecoration: 'none' }}>All Stores</Link>
            <Link href="/reviews" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9, border: '1.5px solid var(--border)', textDecoration: 'none' }}>Store Reviews</Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
