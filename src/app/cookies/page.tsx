import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import LegalPage from '@/components/LegalPage'
import { getLegalPage, type LegalData } from '@/app/admin/_legal/actions'
import { isConfigured } from '@/sanity/client'

export const dynamic = 'force-dynamic'
const BASE = 'https://www.offerdy.com'

const DEFAULTS = {
  h1: 'Cookie Policy', lastUpdated: '2026-06-28', intro: '',
  sections: [], seoTitle: 'Cookie Policy — Offerdy',
  seoDescription: 'Learn how Offerdy uses cookies for analytics and affiliate tracking, and how to manage your preferences.',
  indexPage: true,
}

async function get(): Promise<Required<LegalData>> {
  if (!isConfigured()) return DEFAULTS
  try { const d = await getLegalPage('configCookies'); return { ...DEFAULTS, ...d } } catch { return DEFAULTS }
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await get()
  return { title: d.seoTitle, description: d.seoDescription, alternates: { canonical: `${BASE}/cookies` }, robots: d.indexPage ? undefined : { index: false } }
}

export default async function CookiesPage() {
  const d = await get()
  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}><LegalPage data={d} /></main>
      <Footer />
    </>
  )
}
