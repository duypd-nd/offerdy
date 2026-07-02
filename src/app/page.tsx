import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Hero from '@/components/Hero'
import StoresTicker from '@/components/StoresTicker'
import ExpiringBand from '@/components/ExpiringBand'
import DealsGrid from '@/components/DealsGrid'
import CategoryGrid from '@/components/CategoryGrid'
import ReviewsGrid from '@/components/ReviewsGrid'
import Footer from '@/components/Footer'
import { getDeals, getStores, getCategories, getReviews, getExpiringDeals, getSearchableContent, getConfigContent } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

const BASE = 'https://offerdy.com'

export const metadata: Metadata = {
  alternates: { canonical: BASE },
}

const homepageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'Offerdy',
      url: BASE,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: 'Offerdy',
      url: BASE,
      description: 'Verified coupon codes and deals tested before going live. No expired codes, no checkout disappointments.',
    },
  ],
}

export default async function Home() {
  const [config, stores, categories, reviews, expiringDeals, searchableContent] = await Promise.all([
    getConfigContent(),
    getStores(),
    getCategories(),
    getReviews(),
    getExpiringDeals(),
    getSearchableContent(),
  ])

  const deals = await getDeals(config.dealsPerPage ?? 10)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }} />
      {config.announcementBar && (
        config.announcementBarUrl
          ? <a href={config.announcementBarUrl} className="announce-bar" target="_blank" rel="noopener noreferrer">{config.announcementBar}</a>
          : <div className="announce-bar">{config.announcementBar}</div>
      )}
      <HeaderWrapper />
      <main>
        <Hero searchableContent={searchableContent} />
        <StoresTicker stores={stores.slice(0, 20)} />
        {(config.showExpiringBand !== false) && expiringDeals.length > 0 && <ExpiringBand deals={expiringDeals} />}
        <DealsGrid deals={deals} columns={config.dealsGridColumns} showVerified={config.showVerifiedBadge !== false} />
        <CategoryGrid categories={categories} />
        <ReviewsGrid reviews={reviews} />
      </main>
      <Footer />
    </>
  )
}
