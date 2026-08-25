import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'
import { fillSiteName } from '@/lib/siteNameToken'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { writeClient } from '@/sanity/writeClient'
import { isConfigured } from '@/sanity/client'
import ContactPageClient from './ContactPageClient'

export const dynamic = 'force-dynamic'

const BASE = 'https://www.offerdy.com'

export type FaqItem = { _key: string; question: string; answer: string }

export type ContactData = {
  h1: string; heroLead: string
  email: string; responseTime: string
  phone?: string; address?: string
  formHeading: string; formDesc: string; formAction?: string
  showFaq: boolean; faqHeading: string; faqItems: FaqItem[]
  seoTitle: string; seoDescription: string; indexPage: boolean
}

const DEFAULTS: ContactData = {
  h1: 'Get in touch',
  heroLead: 'Have a question about a deal, want to suggest a store, or just want to say hello? We read every message.',
  email: 'hello@offerdy.com',
  responseTime: 'We typically reply within 24 hours.',
  formHeading: 'Send us a message',
  formDesc: "Fill in the form below and we'll get back to you as soon as possible.",
  showFaq: true,
  faqHeading: 'Frequently asked questions',
  faqItems: [
    { _key: 'f1', question: "A coupon code on {site} didn't work — what should I do?", answer: "Let us know by emailing us with the store name and code. We'll verify it and remove it if it's expired." },
    { _key: 'f2', question: 'How do I suggest a store to add?', answer: "Send us the store name and URL. If it's a good fit, we'll add it and start tracking deals." },
    { _key: 'f3', question: 'Can I partner with {site}?', answer: "Yes — if you're a brand or affiliate network looking to list deals on {site}, reach out via email." },
  ],
  seoTitle: "Contact {site} — We'd Love to Hear from You",
  seoDescription: 'Get in touch with the {site} team. Report a broken coupon code, suggest a store, or ask about partnerships.',
  indexPage: true,
}

function fill<T>(val: T | undefined, fallback: T): T {
  return (val !== undefined && val !== null && (typeof val !== 'string' || val !== '')) ? val : fallback
}

async function getContact(): Promise<ContactData> {
  if (!isConfigured()) return DEFAULTS
  try {
    const doc = await writeClient.fetch(`*[_id == "configContact"][0]`) ?? {}
    return {
      h1:             fill(doc.h1,             DEFAULTS.h1),
      heroLead:       fill(doc.heroLead,       DEFAULTS.heroLead),
      email:          fill(doc.email,          DEFAULTS.email),
      responseTime:   fill(doc.responseTime,   DEFAULTS.responseTime),
      phone:          doc.phone   || undefined,
      address:        doc.address || undefined,
      formHeading:    fill(doc.formHeading,    DEFAULTS.formHeading),
      formDesc:       fill(doc.formDesc,       DEFAULTS.formDesc),
      formAction:     doc.formAction || undefined,
      showFaq:        doc.showFaq !== false,
      faqHeading:     fill(doc.faqHeading,     DEFAULTS.faqHeading),
      faqItems:       doc.faqItems?.length ? doc.faqItems : DEFAULTS.faqItems,
      seoTitle:       fill(doc.seoTitle,       DEFAULTS.seoTitle),
      seoDescription: fill(doc.seoDescription, DEFAULTS.seoDescription),
      indexPage:      doc.indexPage !== false,
    }
  } catch {
    return DEFAULTS
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const [d, siteName] = await Promise.all([getContact(), getSiteName()])
  const seoTitle = fillSiteName(d.seoTitle, siteName)
  const seoDescription = fillSiteName(d.seoDescription, siteName)
  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: `${BASE}/contact` },
    robots: d.indexPage ? undefined : { index: false },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: `${BASE}/contact`,
      type: 'website',
    },
  }
}

export default async function ContactPage() {
  const [raw, siteName] = await Promise.all([getContact(), getSiteName()])
  // Dien o `{site}` MOT LAN o day, truoc khi day xuong client component:
  // ContactPageClient la 'use client' nen khong tu hoi Sanity duoc.
  const n = (t: string) => fillSiteName(t, siteName)
  const d: ContactData = {
    ...raw,
    h1: n(raw.h1), heroLead: n(raw.heroLead),
    formHeading: n(raw.formHeading), formDesc: n(raw.formDesc),
    faqHeading: n(raw.faqHeading),
    faqItems: raw.faqItems.map(f => ({ ...f, question: n(f.question), answer: n(f.answer) })),
    seoTitle: n(raw.seoTitle), seoDescription: n(raw.seoDescription),
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: d.seoTitle,
    url: `${BASE}/contact`,
    description: d.seoDescription,
    mainEntity: {
      '@type': 'Organization',
      name: siteName,
      url: BASE,
      email: d.email,
      ...(d.phone ? { telephone: d.phone } : {}),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <ContactPageClient data={d} siteName={siteName} />
      </main>
      <Footer />
    </>
  )
}
