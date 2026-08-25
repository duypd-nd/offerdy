import type { Metadata } from 'next'
import { fillSiteName } from '@/lib/siteNameToken'
import { getSiteName } from '@/sanity/queries'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getSubmitDealPage, type SubmitDealData } from '@/app/admin/submit-deal/actions'
import { isConfigured } from '@/sanity/client'
import SubmitDealClient from './SubmitDealClient'

export const dynamic = 'force-dynamic'
const BASE = 'https://www.offerdy.com'

const DEFAULTS: Required<SubmitDealData> = {
  h1: 'Submit a Deal',
  heroLead: "Found a coupon code or deal we're missing? Submit it here. We'll verify it before it goes live.",
  formHeading: 'Submit your deal',
  formDesc: 'Fill in the details below. We verify every submission before publishing.',
  formAction: '',
  steps: [
    { _key: 'st1', title: 'Fill in the form', desc: 'Tell us the store, the coupon code or deal, and the discount amount.' },
    { _key: 'st2', title: 'We verify it', desc: 'Our team tests the code at the actual checkout within 24 hours.' },
    { _key: 'st3', title: 'Goes live', desc: 'If it works, we publish it and credit your submission.' },
  ],
  guidelines: [
    'Only submit codes you have personally tested.',
    'Include the expiry date if you know it.',
    'No referral codes or MLM links.',
    'Deals must be applicable to real purchases.',
  ],
  seoTitle: 'Submit a Deal — Help Us Find the Best Coupons',
  seoDescription: "Know a coupon code or deal we're missing? Submit it to {site}. We verify every submission before it goes live.",
  indexPage: true,
}

function fill<T>(v: T | undefined, fb: T): T {
  return (v !== undefined && v !== null && (typeof v !== 'string' || v !== '')) ? v : fb
}

async function get(): Promise<Required<SubmitDealData>> {
  if (!isConfigured()) return DEFAULTS
  try {
    const d = await getSubmitDealPage()
    return {
      h1: fill(d.h1, DEFAULTS.h1), heroLead: fill(d.heroLead, DEFAULTS.heroLead),
      formHeading: fill(d.formHeading, DEFAULTS.formHeading), formDesc: fill(d.formDesc, DEFAULTS.formDesc),
      formAction: d.formAction ?? '',
      steps: d.steps?.length ? d.steps : DEFAULTS.steps,
      guidelines: d.guidelines?.length ? d.guidelines : DEFAULTS.guidelines,
      seoTitle: fill(d.seoTitle, DEFAULTS.seoTitle), seoDescription: fill(d.seoDescription, DEFAULTS.seoDescription),
      indexPage: d.indexPage !== false,
    }
  } catch { return DEFAULTS }
}

export async function generateMetadata(): Promise<Metadata> {
  const [d, siteName] = await Promise.all([get(), getSiteName()])
  return { title: fillSiteName(d.seoTitle, siteName), description: fillSiteName(d.seoDescription, siteName), alternates: { canonical: `${BASE}/submit-deal` }, robots: d.indexPage ? undefined : { index: false } }
}

export default async function SubmitDealPage() {
  // Dien o `{site}` TRUOC khi day xuong SubmitDealClient: no la 'use client' nen
  // khong tu hoi Sanity duoc — va van ban chua dien se lot ca vao goi RSC.
  const [raw, siteName] = await Promise.all([get(), getSiteName()])
  const n = (t: string) => fillSiteName(t, siteName)
  const d: Required<SubmitDealData> = { ...raw,
    h1: n(raw.h1), heroLead: n(raw.heroLead),
    formHeading: n(raw.formHeading), formDesc: n(raw.formDesc),
    steps: raw.steps.map(st => ({ ...st, title: n(st.title), desc: n(st.desc) })),
    guidelines: raw.guidelines.map(n),
    seoTitle: n(raw.seoTitle), seoDescription: n(raw.seoDescription) }
  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <SubmitDealClient data={d} />
      </main>
      <Footer />
    </>
  )
}
