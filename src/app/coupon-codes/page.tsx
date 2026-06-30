import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import CouponCodesContent from './CouponCodesContent'
import { getCouponOffers } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Coupon Codes — Verified Promo Codes | Offerdy',
  description: 'Find verified coupon codes and promo codes for hundreds of stores. Every code tested before going live.',
  alternates: { canonical: 'https://offerdy.com/coupon-codes' },
  openGraph: {
    title: 'Coupon Codes — Verified Promo Codes | Offerdy',
    description: 'Browse all verified coupon codes grouped by store.',
    url: 'https://offerdy.com/coupon-codes',
    type: 'website',
  },
}

export default async function CouponCodesPage() {
  const offers = await getCouponOffers()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Coupon Codes</div>
          <h1 className="page-hero-title">🏷️ Verified Promo Codes</h1>
          <p className="page-hero-sub">Every code tested and verified before it goes live. Updated daily.</p>
        </div>
        <CouponCodesContent offers={offers} />
      </main>
      <Footer />
    </>
  )
}
