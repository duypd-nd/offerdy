import type { Metadata } from 'next'
import Link from 'next/link'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getComparisonPosts } from '@/sanity/queries'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Comparisons — Side-by-Side Deal Analysis | Offerdy',
  description: 'In-depth comparison guides to help you pick the best store, product, or deal. Unbiased, data-driven analysis.',
  alternates: { canonical: 'https://offerdy.com/comparisons' },
  openGraph: {
    title: 'Comparisons — Side-by-Side Deal Analysis | Offerdy',
    description: 'Unbiased store and product comparisons to help you find the best deal.',
    url: 'https://offerdy.com/comparisons',
    type: 'website',
  },
}

export default async function ComparisonsPage() {
  const posts = await getComparisonPosts()

  return (
    <>
      <HeaderWrapper />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Comparisons</div>
          <h1 className="page-hero-title">⚖️ Side-by-Side Comparisons</h1>
          <p className="page-hero-sub">Unbiased analysis to help you pick the best store, platform, or deal.</p>
        </div>

        <div className="section">
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚖️</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--navy)', marginBottom: 8 }}>No comparisons yet</div>
              <div style={{ fontSize: 14, marginBottom: 28 }}>In-depth guides are coming soon.</div>
              <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 9, textDecoration: 'none' }}>
                Browse Blog →
              </Link>
            </div>
          ) : (
            <div className="blog-grid">
              {posts.map((post: {
                id: string; slug: string; title: string; excerpt?: string
                author?: string; date?: string; coverEmoji?: string; coverBg?: string; readTime?: number
              }) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                  <div className="blog-card-img" style={{ background: post.coverBg ?? 'linear-gradient(135deg,#EEF2FF,#C7D2FE)', overflow: 'hidden', padding: 0 }}>
                    {post.imageUrl
                      ? <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : (post.coverEmoji ?? '⚖️')}
                  </div>
                  <div className="blog-card-body">
                    <span className="blog-cat" style={{ background: 'rgba(99,102,241,.1)', color: '#4F46E5' }}>
                      Comparison
                    </span>
                    <div className="blog-card-title">{post.title}</div>
                    {post.excerpt && <div className="blog-card-excerpt">{post.excerpt}</div>}
                    <div className="blog-card-meta">
                      {post.date && <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      {post.readTime && <span>{post.readTime} min read</span>}
                    </div>
                    <span className="blog-card-read">Read comparison →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
