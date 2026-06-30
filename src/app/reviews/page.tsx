import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import ReviewsPageContent from '@/components/ReviewsPageContent'
import { getReviews } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Product Reviews — Honest, Tested & Verified',
  description: 'In-depth product reviews written by real buyers. No sponsored content, no bias — just honest assessments to help you shop smarter.',
  alternates: { canonical: 'https://offerdy.com/reviews' },
  openGraph: {
    title: 'Product Reviews — Honest, Tested & Verified — Offerdy',
    description: 'In-depth product reviews written by real buyers. No sponsored content, no bias.',
    url: 'https://offerdy.com/reviews',
    type: 'website',
  },
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
      </main>
      <Footer />
    </>
  )
}
