import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import BlogPageContent from '@/components/BlogPageContent'
import { getSiteName, getPosts, getConfigContent } from '@/sanity/queries'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    title: 'Blog — Shopping Tips, Deal Guides & More',
    description: 'Shopping tips, deal guides, and store breakdowns to help you save more money every time you shop online.',
    alternates: { canonical: '/blog' },
    openGraph: {
      title: `Blog — Shopping Tips, Deal Guides & More — ${siteName}`,
      description: 'Shopping tips, deal guides, and store breakdowns to help you save more money.',
      url: '/blog',
      type: 'website',
    },
  }
}

export default async function BlogPage() {
  const [posts, config] = await Promise.all([getPosts(), getConfigContent()])

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Blog</div>
          <h1 className="page-hero-title">Shopping Tips & Guides</h1>
          <p className="page-hero-sub">Strategies, store spotlights, and roundups to help you spend smarter.</p>
        </div>
        <BlogPageContent posts={posts} columns={config.blogGridColumns} />
      </main>
      <Footer />
    </>
  )
}
