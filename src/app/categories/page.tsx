import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getSiteName, getCategories } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: 'Shop by Category',
    description: 'Browse verified deals and coupon codes by category — tech, fashion, home, beauty and more.',
    alternates: { canonical: 'https://www.offerdy.com/categories' },
    openGraph: {
      title: `Shop by Category — ${siteName}`,
      description: 'Browse verified deals and coupon codes by category.',
      url: 'https://www.offerdy.com/categories',
      type: 'website',
    },
    twitter: { card: 'summary', title: `Shop by Category — ${siteName}` },
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <span className="sol-crumb-cur">Categories</span>
          </div>
        </div>

        <div className="section">
          <div className="section-header" style={{ marginBottom: 28 }}>
            <div>
              <div className="section-title">Browse by Category</div>
              <div className="section-sub">Find deals in the categories you shop most</div>
            </div>
          </div>
          <div className="cat-grid">
            {categories.map((cat: { id: string; name: string; emoji: string; count: string; colorClass: string; slug?: string }) => (
              <Link key={cat.id} href={`/categories/${cat.slug ?? cat.id}`} className={`cat-card ${cat.colorClass}`}>
                <span className="cat-emoji">{cat.emoji}</span>
                <div className="cat-info">
                  <div className="cat-name">{cat.name}</div>
                  <div className="cat-count">{cat.count}</div>
                </div>
                <div className="cat-arr">→</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
