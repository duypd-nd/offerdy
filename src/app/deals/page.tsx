import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import DealsPageContent from '@/components/DealsPageContent'
import { getAllDeals } from '@/sanity/queries'
import { dealsItemListJsonLd } from '@/lib/dealSchema'

export const revalidate = 60

const PAGE_SIZE = 20
const BASE_TITLE = "Today's Best Deals & Coupon Codes"
const BASE_DESCRIPTION = 'Browse hundreds of verified coupon codes and deals updated daily. Every code tested before going live — no expired coupons.'

type PageProps = { searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const canonical = page > 1 ? `https://offerdy.com/deals?page=${page}` : 'https://offerdy.com/deals'
  const title = page > 1 ? `${BASE_TITLE} — Page ${page}` : BASE_TITLE

  return {
    title,
    description: BASE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: `${title} — Offerdy`,
      description: BASE_DESCRIPTION,
      url: canonical,
      type: 'website',
    },
  }
}

export default async function DealsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const allDeals = await getAllDeals()
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages)
  const deals = allDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const jsonLd = dealsItemListJsonLd(allDeals)

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Deals</div>
          <h1 className="page-hero-title">Today&rsquo;s Best Deals</h1>
          <p className="page-hero-sub">Every coupon verified before it goes live. Updated daily.</p>
        </div>
        <DealsPageContent deals={deals} page={page} totalPages={totalPages} totalCount={allDeals.length} />
      </main>
      <Footer />
    </>
  )
}
