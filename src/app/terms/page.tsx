import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'
import { fillSiteName } from '@/lib/siteNameToken'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import LegalPage from '@/components/LegalPage'
import { getLegalPage, type LegalData } from '@/app/admin/_legal/actions'
import { isConfigured } from '@/sanity/client'

export const dynamic = 'force-dynamic'

const DEFAULTS = {
  h1: 'Terms of Use', lastUpdated: '2026-06-28', intro: '',
  sections: [], seoTitle: 'Terms of Use',
  seoDescription: 'Read the Terms of Use for {site}. By using our coupon code platform, you agree to these terms.',
  indexPage: true,
}

async function get(): Promise<Required<LegalData>> {
  if (!isConfigured()) return DEFAULTS
  try { const d = await getLegalPage('configTerms'); return { ...DEFAULTS, ...d } } catch { return DEFAULTS }
}

export async function generateMetadata(): Promise<Metadata> {
  const [d, siteName] = await Promise.all([get(), getSiteName()])
  return { title: fillSiteName(d.seoTitle, siteName), description: fillSiteName(d.seoDescription, siteName), alternates: { canonical: '/terms' }, robots: d.indexPage ? undefined : { index: false } }
}

export default async function TermsPage() {
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
