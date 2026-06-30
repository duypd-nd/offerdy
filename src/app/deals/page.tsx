import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import DealsPageContent from '@/components/DealsPageContent'
import { getAllDeals } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: "Today's Best Deals & Coupon Codes",
  description: 'Browse hundreds of verified coupon codes and deals updated daily. Every code tested before going live — no expired coupons.',
  alternates: { canonical: 'https://offerdy.com/deals' },
  openGraph: {
    title: "Today's Best Deals & Coupon Codes — Offerdy",
    description: 'Browse hundreds of verified coupon codes and deals updated daily.',
    url: 'https://offerdy.com/deals',
    type: 'website',
  },
}

export default async function DealsPage() {
  const deals = await getAllDeals()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Deals</div>
          <h1 className="page-hero-title">Today&rsquo;s Best Deals</h1>
          <p className="page-hero-sub">Every coupon verified before it goes live. Updated daily.</p>
        </div>
        <DealsPageContent deals={deals} />
      </main>
      <Footer />
    </>
  )
}
