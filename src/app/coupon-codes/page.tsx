import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import CouponCodesContent from './CouponCodesContent'
import { getCouponOffers } from '@/sanity/queries'
import { couponsItemListJsonLd } from '@/lib/dealSchema'

export const revalidate = 60

const PAGE_SIZE = 20
const BASE_TITLE = 'Coupon Codes — Verified Promo Codes | Offerdy'
const BASE_DESCRIPTION = 'Find verified coupon codes and promo codes for hundreds of stores. Every code tested before going live.'

type PageProps = { searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const canonical = page > 1 ? `https://www.offerdy.com/coupon-codes?page=${page}` : 'https://www.offerdy.com/coupon-codes'
  const title = page > 1 ? `Coupon Codes — Page ${page} | Offerdy` : BASE_TITLE

  return {
    title,
    description: BASE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title,
      description: 'Browse all verified coupon codes grouped by store.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function CouponCodesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const offers = await getCouponOffers()
  const totalPages = Math.max(1, Math.ceil(offers.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages)
  const jsonLd = couponsItemListJsonLd(offers)

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Coupon Codes</div>
          <h1 className="page-hero-title">🏷️ Verified Promo Codes</h1>
          <p className="page-hero-sub">Every code tested and verified before it goes live. Updated daily.</p>
        </div>
        <CouponCodesContent offers={offers} page={page} totalPages={totalPages} />
      </main>
      <Footer />
    </>
  )
}
