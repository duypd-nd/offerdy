import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import BlogPageContent from '@/components/BlogPageContent'
import { getSiteName, getTipsGuidePosts } from '@/sanity/queries'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: 'Tips & Guides — Smart Shopping Advice',
    description: 'Shopping tips, saving strategies, and expert guides to help you get the best deals online every time.',
    alternates: { canonical: '/tips-guides' },
    openGraph: {
      title: `Tips & Guides — Smart Shopping Advice | ${siteName}`,
      description: 'Practical guides on how to save more, stack coupons, and shop smarter.',
      url: '/tips-guides',
      type: 'website',
    },
  }
}

export default async function TipsGuidesPage() {
  const posts = await getTipsGuidePosts()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Tips & Guides</div>
          <h1 className="page-hero-title">📖 Shopping Guides</h1>
          <p className="page-hero-sub">Strategies, tips, and deep dives to help you spend smarter and save more.</p>
        </div>
        <BlogPageContent posts={posts} showTabs={false} />
      </main>
      <Footer />
    </>
  )
}
