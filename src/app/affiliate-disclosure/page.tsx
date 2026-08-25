import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import { getSiteName } from '@/sanity/queries'
import { fillSiteName } from '@/lib/siteNameToken'
import Footer from '@/components/Footer'
import LegalPage from '@/components/LegalPage'
import { getLegalPage, type LegalData } from '@/app/admin/_legal/actions'
import { isConfigured } from '@/sanity/client'

export const dynamic = 'force-dynamic'
const BASE = 'https://www.offerdy.com'

const DEFAULTS = {
  h1: 'Affiliate Disclosure', lastUpdated: '2026-06-28', intro: '',
  sections: [], seoTitle: 'Affiliate Disclosure',
  seoDescription: '{site} earns affiliate commissions when you shop through our links, at no extra cost to you. Read our full disclosure.',
  indexPage: true,
}

async function get(): Promise<Required<LegalData>> {
  if (!isConfigured()) return DEFAULTS
  try { const d = await getLegalPage('configAffiliateDisclosure'); return { ...DEFAULTS, ...d } } catch { return DEFAULTS }
}

export async function generateMetadata(): Promise<Metadata> {
  const [d, siteName] = await Promise.all([get(), getSiteName()])
  return { title: fillSiteName(d.seoTitle, siteName), description: fillSiteName(d.seoDescription, siteName), alternates: { canonical: `${BASE}/affiliate-disclosure` }, robots: d.indexPage ? undefined : { index: false } }
}

export default async function AffiliateDisclosurePage() {
  const [raw, siteName] = await Promise.all([get(), getSiteName()])
  const n = (t: string) => fillSiteName(t, siteName)
  // Van ban phap ly soan trong admin cung dung duoc o `{site}` — doi ten website
  // la doi luon trong dieu khoan, khong phai sua tay tung trang.
  const d = { ...raw, h1: n(raw.h1), intro: n(raw.intro),
    sections: raw.sections.map(sec => ({ ...sec, heading: n(sec.heading), body: n(sec.body) })),
    seoTitle: n(raw.seoTitle), seoDescription: n(raw.seoDescription) }
  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}><LegalPage data={d} /></main>
      <Footer />
    </>
  )
}
