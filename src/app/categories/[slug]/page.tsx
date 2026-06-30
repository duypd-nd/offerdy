import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getCategoryBySlug, getStoresByCategory } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return {}
  return {
    title: `${cat.emoji} ${cat.name} Deals & Coupons — Offerdy`,
    description: cat.description ?? `Browse the best ${cat.name} deals and verified coupon codes.`,
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [cat, stores] = await Promise.all([
    getCategoryBySlug(slug),
    getStoresByCategory(slug),
  ])

  if (!cat) notFound()

  return (
    <>
      <HeaderWrapper />
      <main>
        {/* Breadcrumb */}
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <Link href="/categories" className="sol-crumb-back">Categories</Link>
            <span className="sol-crumb-sep">/</span>
            <span className="sol-crumb-cur">{cat.name}</span>
          </div>
        </div>

        {/* Hero */}
        <div className={`cat-hero ${cat.colorClass}`}>
          <div className="cat-hero-inner">
            <div className="cat-hero-emoji">{cat.emoji}</div>
            <div>
              <h1 className="cat-hero-title">{cat.name}</h1>
              {cat.description && <p className="cat-hero-desc">{cat.description}</p>}
              <div className="cat-hero-count">{cat.count}</div>
            </div>
          </div>
        </div>

        {/* Stores */}
        <div className="section">
          <div className="section-header" style={{ marginBottom: 24 }}>
            <div>
              <div className="section-title">Stores in {cat.name}</div>
              <div className="section-sub">{stores.length > 0 ? `${stores.length} store${stores.length !== 1 ? 's' : ''} found` : 'No stores yet'}</div>
            </div>
          </div>

          {stores.length > 0 ? (
            <div className="stores-page-grid">
              {stores.map((store: { id: string; name: string; abbr?: string; colorClass?: string; slug: string; maxOffer?: number; imageUrl?: string }) => (
                <Link key={store.id} href={`/stores/${store.slug}`} className="store-page-card store-card">
                  <div className={`store-page-sa ${store.colorClass ?? 'sa-default'}`}>
                    {store.imageUrl
                      ? <img src={store.imageUrl} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : store.abbr}
                  </div>
                  <div className="store-page-info">
                    <div className="store-page-name">{store.name}</div>
                    {store.maxOffer && <div className="store-page-offer">Up to {store.maxOffer}% off</div>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="store-empty">
              <div className="store-empty-icon">{cat.emoji}</div>
              <div className="store-empty-title">Chưa có store nào trong danh mục này</div>
              <div className="store-empty-sub">Check back soon — we add new stores regularly.</div>
              <Link href="/stores" className="article-cta" style={{ display: 'inline-block', marginTop: 16 }}>Browse all stores →</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
