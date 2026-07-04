import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import BlogPageContent from '@/components/BlogPageContent'
import { getPosts, getConfigContent } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog — Shopping Tips, Deal Guides & More',
  description: 'Shopping tips, deal guides, and store breakdowns to help you save more money every time you shop online.',
  alternates: { canonical: 'https://www.offerdy.com/blog' },
  openGraph: {
    title: 'Blog — Shopping Tips, Deal Guides & More — Offerdy',
    description: 'Shopping tips, deal guides, and store breakdowns to help you save more money.',
    url: 'https://www.offerdy.com/blog',
    type: 'website',
  },
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
