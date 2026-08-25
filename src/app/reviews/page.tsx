import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import ReviewsPageContent from '@/components/ReviewsPageContent'
import { getSiteName, getReviews } from '@/sanity/queries'
import AllLinksIndex from '@/components/AllLinksIndex'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: 'Product Reviews — Honest, Tested & Verified',
    description: 'In-depth product reviews written by real buyers. No sponsored content, no bias — just honest assessments to help you shop smarter.',
    alternates: { canonical: 'https://www.offerdy.com/reviews' },
    openGraph: {
      title: `Product Reviews — Honest, Tested & Verified — ${siteName}`,
      description: 'In-depth product reviews written by real buyers. No sponsored content, no bias.',
      url: 'https://www.offerdy.com/reviews',
      type: 'website',
    },
  }
}

export default async function ReviewsPage() {
  const reviews = await getReviews()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Reviews & Comparisons</div>
          <h1 className="page-hero-title">In-Depth Reviews</h1>
          <p className="page-hero-sub">Real-world tested. We buy, use, and report — no sponsored fluff.</p>
        </div>
        <ReviewsPageContent reviews={reviews} />

        {/* Cùng lý do với /stores: lưới ở trên phân trang bằng trạng thái React
            (20 bài/trang) nên HTML máy chủ bỏ sót phần còn lại. */}
        <AllLinksIndex
          title="All reviews"
          hint={`Every one of our ${reviews.length} hands-on reviews.`}
          items={reviews.map((r: { slug: string; title: string }) => ({
            href: `/reviews/${r.slug}`,
            label: r.title,
          }))}
        />
      </main>
      <Footer />
    </>
  )
}
