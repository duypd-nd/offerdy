import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Hero from '@/components/Hero'
import StoresTicker from '@/components/StoresTicker'
import ExpiringBand from '@/components/ExpiringBand'
import DealsGrid from '@/components/DealsGrid'
import CategoryGrid from '@/components/CategoryGrid'
import ReviewsGrid from '@/components/ReviewsGrid'
import Footer from '@/components/Footer'
import { getDeals, getStores, getCategories, getReviews, getExpiringDeals, getConfigContent } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

const BASE = 'https://offerdy.com'

export const metadata: Metadata = {
  alternates: { canonical: BASE },
}

export default async function Home() {
  const [config, stores, categories, reviews, expiringDeals] = await Promise.all([
    getConfigContent(),
    getStores(),
    getCategories(),
    getReviews(),
    getExpiringDeals(),
  ])

  const deals = await getDeals(config.dealsPerPage ?? 10)

  return (
    <>
      {config.announcementBar && (
        config.announcementBarUrl
          ? <a href={config.announcementBarUrl} className="announce-bar" target="_blank" rel="noopener noreferrer">{config.announcementBar}</a>
          : <div className="announce-bar">{config.announcementBar}</div>
      )}
      <HeaderWrapper />
      <main>
        <Hero />
        <StoresTicker stores={stores.slice(0, 20)} />
        {(config.showExpiringBand !== false) && expiringDeals.length > 0 && <ExpiringBand deals={expiringDeals} />}
        <DealsGrid deals={deals} columns={config.dealsGridColumns} showVerified={config.showVerifiedBadge !== false} />
        {(config.showCategoryGrid !== false) && <CategoryGrid categories={categories} />}
        <ReviewsGrid reviews={reviews} columns={config.reviewsGridColumns} />
      </main>
      <Footer />
    </>
  )
}
