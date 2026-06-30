import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import FlashSalesContent from './FlashSalesContent'
import { getFlashSaleOffers } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Flash Sales — Limited-Time Deals | Offerdy',
  description: 'Deals expiring soon — grab them before the clock runs out. Verified flash sales updated in real time.',
  alternates: { canonical: 'https://offerdy.com/flash-sales' },
  openGraph: {
    title: 'Flash Sales — Limited-Time Deals | Offerdy',
    description: 'Time-sensitive deals with live countdown timers. Never miss a flash sale again.',
    url: 'https://offerdy.com/flash-sales',
    type: 'website',
  },
}

export default async function FlashSalesPage() {
  const offers = await getFlashSaleOffers()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Flash Sales</div>
          <h1 className="page-hero-title">⚡ Deals Expiring Soon</h1>
          <p className="page-hero-sub">Limited-time offers — grab them before the clock runs out.</p>
        </div>
        <FlashSalesContent offers={offers} />
      </main>
      <Footer />
    </>
  )
}
