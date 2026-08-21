import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import StoresPageContent from '@/components/StoresPageContent'
import { getStores } from '@/sanity/queries'
import AllLinksIndex from '@/components/AllLinksIndex'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'All Stores — Coupon Codes & Deals by Store',
  description: 'Find verified coupon codes and deals for hundreds of online stores. Browse by store to see all active offers.',
  alternates: { canonical: 'https://www.offerdy.com/stores' },
  openGraph: {
    title: 'All Stores — Coupon Codes & Deals by Store — Offerdy',
    description: 'Find verified coupon codes and deals for hundreds of online stores.',
    url: 'https://www.offerdy.com/stores',
    type: 'website',
  },
}

export default async function StoresPage() {
  const stores = await getStores()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Stores</div>
          <h1 className="page-hero-title">Browse by Store</h1>
          <p className="page-hero-sub">Active deals from the world&rsquo;s top brands — all verified.</p>
        </div>
        <StoresPageContent stores={stores} />

        {/* ⚠️ Lưới ở trên phân trang bằng trạng thái React, nên HTML máy chủ chỉ
            chứa 24 store đầu — 83 store còn lại từng KHÔNG có link nào trỏ tới
            từ bất kỳ đâu trên site. Xem chú thích trong AllLinksIndex.tsx. */}
        <AllLinksIndex
          title="All stores A–Z"
          hint={`Every one of our ${stores.length} stores — pick a brand to see its verified codes and deals.`}
          groupByLetter
          items={stores.map((s: { slug?: string; name: string }) => ({
            href: `/stores/${s.slug ?? s.name.toLowerCase().replace(/\s+/g, '-')}`,
            label: s.name,
          }))}
        />
      </main>
      <Footer />
    </>
  )
}
