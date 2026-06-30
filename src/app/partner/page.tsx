import type { Metadata } from 'next'
import Link from 'next/link'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getPartnerPage, type PartnerData, type Benefit } from '@/app/admin/partner/actions'
import { isConfigured } from '@/sanity/client'

export const dynamic = 'force-dynamic'
const BASE = 'https://offerdy.com'

const DEFAULTS: Required<PartnerData> = {
  h1: 'Partner with Offerdy',
  heroLead: "We work with brands, retailers, and affiliate networks to bring verified deals to shoppers worldwide. Let's grow together.",
  benefitsHeading: 'Why partner with us?',
  benefits: [
    { _key: 'b1', title: 'Engaged deal-seekers', desc: 'Our audience actively searches for coupons — high purchase intent, low bounce rate.' },
    { _key: 'b2', title: 'Verified placements', desc: 'Every deal is tested before going live. Your offers appear alongside trusted, working codes.' },
    { _key: 'b3', title: 'Global reach', desc: 'Offerdy covers 500+ stores internationally. We reach shoppers from dozens of countries.' },
    { _key: 'b4', title: 'Performance-based', desc: 'We work on affiliate commission — you pay only for results, not impressions.' },
  ],
  ctaHeading: 'Ready to get started?',
  ctaBody: "Reach out with your store name, affiliate network, and what you're looking for. We'll get back to you within 48 hours.",
  contactEmail: 'partners@offerdy.com',
  seoTitle: 'Partner with Offerdy — Reach Millions of Deal-Seekers',
  seoDescription: 'Partner with Offerdy to feature your deals in front of an engaged audience of shoppers. Affiliate-based, performance-driven.',
  indexPage: true,
}

function fill<T>(v: T | undefined, fb: T): T {
  return (v !== undefined && v !== null && (typeof v !== 'string' || v !== '')) ? v : fb
}

async function get(): Promise<Required<PartnerData>> {
  if (!isConfigured()) return DEFAULTS
  try {
    const d = await getPartnerPage()
    return {
      h1: fill(d.h1, DEFAULTS.h1), heroLead: fill(d.heroLead, DEFAULTS.heroLead),
      benefitsHeading: fill(d.benefitsHeading, DEFAULTS.benefitsHeading),
      benefits: d.benefits?.length ? d.benefits : DEFAULTS.benefits,
      ctaHeading: fill(d.ctaHeading, DEFAULTS.ctaHeading), ctaBody: fill(d.ctaBody, DEFAULTS.ctaBody),
      contactEmail: fill(d.contactEmail, DEFAULTS.contactEmail),
      seoTitle: fill(d.seoTitle, DEFAULTS.seoTitle), seoDescription: fill(d.seoDescription, DEFAULTS.seoDescription),
      indexPage: d.indexPage !== false,
    }
  } catch { return DEFAULTS }
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await get()
  return { title: d.seoTitle, description: d.seoDescription, alternates: { canonical: `${BASE}/partner` }, robots: d.indexPage ? undefined : { index: false } }
}

export default async function PartnerPage() {
  const d = await get()
  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 96px' }}>

          {/* Hero */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Partner Program
          </div>
          <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.12, letterSpacing: '-.7px', textWrap: 'balance', marginBottom: 14, maxWidth: 560 }}>{d.h1}</h1>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.72, maxWidth: 540, marginBottom: 52 }}>{d.heroLead}</p>

          {/* Benefits */}
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', marginBottom: 22 }}>{d.benefitsHeading}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
              {(d.benefits as Benefit[]).map(b => (
                <div key={b._key} style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '22px 24px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{b.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.62 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div style={{ background: 'var(--navy)', borderRadius: 18, padding: '36px 40px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{d.ctaHeading}</h2>
            <p style={{ fontSize: 15, color: '#7A8BA8', lineHeight: 1.75, marginBottom: 28 }}>{d.ctaBody}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href={`mailto:${d.contactEmail}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--green)', color: 'var(--navy)', fontSize: 14, fontWeight: 700, padding: '11px 22px', borderRadius: 9, textDecoration: 'none' }}>
                Email us →
              </a>
              <Link href="/contact" style={{ fontSize: 13, color: '#7A8BA8', textDecoration: 'none', fontWeight: 500 }}>
                Or use our contact form
              </Link>
            </div>
            <div style={{ marginTop: 20, fontSize: 12, color: '#4A5A72' }}>
              {d.contactEmail}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
