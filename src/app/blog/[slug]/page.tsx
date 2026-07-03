import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getPostBySlug, getPosts, getConfigContent } from '@/sanity/queries'
import { posts as staticPosts } from '@/data/posts'

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

const BASE = 'https://offerdy.com'

const CAT_CLASS: Record<string, string> = {
  'Tips & Guides': 'cat-tips',
  'Deals Roundup': 'cat-roundup',
  'Store Guide': 'cat-store',
  'News': 'cat-news',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  const title = post.title
  const description = post.excerpt ?? `Read ${post.title} on Offerdy.`
  const url = `${BASE}/blog/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Offerdy',
      type: 'article',
      publishedTime: post.date ?? undefined,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, allPosts, globalConfig] = await Promise.all([
    getPostBySlug(slug),
    getPosts(),
    getConfigContent(),
  ])

  if (!post) notFound()

  let sidebarPosts = allPosts
    .filter((p: { slug: string }) => p.slug !== slug)
    .slice(0, 6)

  if (sidebarPosts.length === 0) {
    sidebarPosts = staticPosts
      .filter(p => p.slug !== slug)
      .slice(0, 6)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt ?? undefined,
        author: post.author ? { '@type': 'Person', name: post.author } : undefined,
        datePublished: post.date ?? undefined,
        publisher: { '@type': 'Organization', name: 'Offerdy', url: BASE },
        url: `${BASE}/blog/${slug}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE}/blog/${slug}` },
        ],
      },
    ],
  }

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="sol-crumb">
          <div className="sol-crumb-inner">
            <Link href="/" className="sol-crumb-back">Home</Link>
            <span className="sol-crumb-sep">/</span>
            <Link href="/blog" className="sol-crumb-back">Blog</Link>
            <span className="sol-crumb-sep">/</span>
            {post.category && <><span className="sol-crumb-cat">{post.category}</span><span className="sol-crumb-sep">/</span></>}
            <span className="sol-crumb-cur">{post.title}</span>
          </div>
        </div>

        <div className="article-layout">
          {/* ── MAIN ARTICLE ── */}
          <article className="article-wrap">
            <div className="article-tag-row">
              <span className={`blog-cat ${CAT_CLASS[post.category] ?? 'cat-tips'}`}>
                {post.category}
              </span>
            </div>

            <h1 className="article-title">{post.title}</h1>

            <div className="article-meta">
              <span>✍️ {post.author}</span>
              <span>📅 {post.date}</span>
              <span>⏱ {post.readTime} min read</span>
            </div>

            <div className="article-hero-img" style={{ background: post.imageUrl ? undefined : post.coverBg, overflow: post.imageUrl ? 'hidden' : undefined }}>
              {post.imageUrl
                ? <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : post.coverEmoji}
            </div>

            <div className="article-body">
              {post.excerpt && (
                <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 28, lineHeight: 1.7 }}>
                  {post.excerpt}
                </p>
              )}

              {'content' in post && typeof (post as { content?: string }).content === 'string' && (post as { content: string }).content.length > 100 ? (
                <div dangerouslySetInnerHTML={{ __html: (post as { content: string }).content }} />
              ) : 'body' in post && Array.isArray((post as { body?: unknown[] }).body) && (post as { body: unknown[] }).body.length > 0 ? (
                <PortableBody body={(post as { body: unknown[] }).body} />
              ) : (
                <PlaceholderBody category={post.category} />
              )}
            </div>

            {(globalConfig.articleDisclaimer || globalConfig.articleReviewedBy) && (
              <div className="article-disclaimer">
                {globalConfig.articleDisclaimer && (
                  <p dangerouslySetInnerHTML={{ __html: globalConfig.articleDisclaimer.replace(/\{site\}/g, 'Offerdy').replace(/\{store\}/g, '<span style="color:#16a34a;font-weight:700">the store</span>') }} />
                )}
                {globalConfig.articleReviewedBy && (
                  <p className="article-disclaimer-meta">
                    {post.date && `Last updated: ${fmtDate(post.date)} · `}{globalConfig.articleReviewedBy}
                  </p>
                )}
              </div>
            )}
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="article-sidebar">
            {sidebarPosts.length > 0 && (
              <div className="asb-box">
                <div className="asb-title">Recent Posts</div>
                {sidebarPosts.map((p: {
                  slug: string
                  title: string
                  category?: string
                  coverEmoji?: string
                  coverBg?: string
                  imageUrl?: string
                }) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="asb-card">
                    <div className="asb-thumb" style={{ background: p.imageUrl ? undefined : (p.coverBg ?? 'var(--bg)'), fontSize: 28 }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.title} />
                        : (p.coverEmoji ?? '📝')}
                    </div>
                    <div className="asb-info">
                      <div className="asb-name">{p.title}</div>
                      {p.category && <span className="asb-tag">{p.category}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  )
}

function PlaceholderBody({ category }: { category: string }) {
  if (category === 'Tips & Guides') {
    return (
      <>
        <h2>Why This Matters</h2>
        <p>
          Most shoppers are leaving significant savings on the table simply because they don&rsquo;t know
          the right techniques. The strategies in this guide are battle-tested across thousands of
          transactions — and they work on virtually every major e-commerce platform.
        </p>
        <h2>Step-by-Step Breakdown</h2>
        <p>
          We&rsquo;ll walk through each technique in detail, with real examples showing exactly how much
          you can save. Some of these will take two minutes to set up; others require a bit more effort
          but pay off every single time you shop.
        </p>
        <div className="article-verdict">
          <div className="article-verdict-lbl">Key Takeaway</div>
          <div className="article-verdict-text">
            The biggest gains come from combining multiple techniques — not any single trick on its own.
            Stack them and you can regularly hit discounts that most shoppers don&rsquo;t believe are possible.
          </div>
        </div>
        <h2>What to Do Right Now</h2>
        <p>
          Start with the first two techniques — they require no setup and you can use them on your next
          purchase. Then work your way through the list as you get more comfortable.
        </p>
        <Link href="/deals" className="article-cta">Browse today&rsquo;s verified deals →</Link>
      </>
    )
  }
  if (category === 'Deals Roundup') {
    return (
      <>
        <h2>What&rsquo;s Included</h2>
        <p>
          We scoured hundreds of listings to bring you only the deals that cleared our verification
          process. Every price was cross-checked against 90-day historical data to confirm the
          discount is genuine.
        </p>
        <h2>Best Picks This Week</h2>
        <p>
          The standout deals this period come from tech and home categories, where we&rsquo;re seeing
          some of the deepest discounts in months. A few of these are time-limited — check the
          expiry before you buy.
        </p>
        <div className="article-verdict">
          <div className="article-verdict-lbl">Editor&rsquo;s Pick</div>
          <div className="article-verdict-text">
            The tech deals are the highlight this round — genuine discounts, not inflated list prices.
            Move quickly on anything in the Expiring Soon section.
          </div>
        </div>
        <Link href="/deals" className="article-cta">See all live deals →</Link>
      </>
    )
  }
  if (category === 'Store Guide') {
    return (
      <>
        <h2>Our Methodology</h2>
        <p>
          We tested this store across three months of purchases, tracking prices, delivery times,
          return experience, and customer support. Our sample spanned categories from electronics to
          home goods.
        </p>
        <h2>Pros & Cons</h2>
        <p>
          Every platform has trade-offs. We&rsquo;ll give you the honest version — what this store does
          better than the competition, and where you should shop elsewhere.
        </p>
        <div className="article-verdict">
          <div className="article-verdict-lbl">Our Verdict</div>
          <div className="article-verdict-text">
            A reliable choice for most categories, with a few exceptions noted above. Use our live
            deal feed to catch the best prices before they expire.
          </div>
        </div>
        <Link href="/stores" className="article-cta">Browse all stores →</Link>
      </>
    )
  }
  return (
    <>
      <h2>What This Means for Shoppers</h2>
      <p>
        Industry developments like this one have a direct impact on where the best deals show up and
        how long they last. We&rsquo;ll keep tracking this story as it develops.
      </p>
      <div className="article-verdict">
        <div className="article-verdict-lbl">Bottom Line</div>
        <div className="article-verdict-text">
          Watch this space — we&rsquo;ll update this article as new information becomes available. In the
          meantime, our deal alerts will flag anything relevant.
        </div>
      </div>
      <Link href="/deals" className="article-cta">See today&rsquo;s deals →</Link>
    </>
  )
}

function PortableBody({ body }: { body: unknown[] }) {
  return (
    <>
      {body.map((block: unknown, i: number) => {
        const b = block as { _type: string; style?: string; children?: { text: string }[]; listItem?: string }
        if (b._type !== 'block') return null
        const text = b.children?.map(c => c.text).join('') ?? ''
        if (!text) return null
        if (b.listItem) return <li key={i}>{text}</li>
        const Tag = (b.style === 'h2' ? 'h2' : b.style === 'h3' ? 'h3' : 'p') as 'h2' | 'h3' | 'p'
        return <Tag key={i}>{text}</Tag>
      })}
    </>
  )
}
