import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getComparisonPosts } from '@/sanity/queries'

export const revalidate = 60

// Khi chua co bai Comparison nao, trang chi hien empty state -> khong cho Google
// index (thin content), nhung van de follow de link equity chay sang /blog.
// Tu dong index lai ngay khi co bai dau tien, khong can sua code.
// Sitemap cung loai /comparisons ra trong cung dieu kien — xem src/app/sitemap.ts
export async function generateMetadata(): Promise<Metadata> {
  const posts = await getComparisonPosts()

  return {
    title: 'Comparisons — Side-by-Side Deal Analysis | Offerdy',
    description: 'In-depth comparison guides to help you pick the best store, product, or deal. Unbiased, data-driven analysis.',
    alternates: { canonical: 'https://www.offerdy.com/comparisons' },
    ...(posts.length === 0 && { robots: { index: false, follow: true } }),
    openGraph: {
      title: 'Comparisons — Side-by-Side Deal Analysis | Offerdy',
      description: 'Unbiased store and product comparisons to help you find the best deal.',
      url: 'https://www.offerdy.com/comparisons',
      type: 'website',
    },
  }
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
                author?: string; date?: string; coverEmoji?: string; coverBg?: string; readTime?: number; imageUrl?: string
              }) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                  <div className="blog-card-img" style={{ background: post.coverBg ?? 'linear-gradient(135deg,#EEF2FF,#C7D2FE)', overflow: 'hidden', padding: 0 }}>
                    {post.imageUrl
                      ? <Image src={post.imageUrl} alt={post.title} fill sizes="(max-width: 768px) 33vw, 360px" style={{ objectFit: 'cover' }} />
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
