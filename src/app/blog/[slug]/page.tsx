import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getPostBySlug, getPosts, getConfigContent, getConfigAuthor, getStoreRefForHtml, getStoreTopCoupon } from '@/sanity/queries'
import { renderPostTokens, priceNote, type RenderProduct } from '@/lib/postRender'
import { pickSidebarPosts, type RelatablePost } from '@/lib/relatedPosts'
import ReviewCouponBox from '@/components/ReviewCouponBox'
import { catClass } from '@/lib/postCategory'
import { posts as staticPosts } from '@/data/posts'

export const revalidate = 60

// Bat buoc phai co ham nay (du tra ve mang rong) thi revalidate o tren moi
// thuc su co hieu luc voi route dynamic [slug] - xem stores/[slug]/page.tsx
export async function generateStaticParams() {
  return []
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

const BASE = 'https://www.offerdy.com'

/** Bai o o ben canh. `getPosts` khong co kieu (GROQ), nen khai ro dung phan can dung. */
type SidebarPost = RelatablePost & {
  coverEmoji?: string
  coverBg?: string
  imageUrl?: string
}


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  // ⚠️ `metaTitle` KHONG duoc chua chu "Offerdy": `titleTemplate` o layout tu them
  // duoi thuong hieu, va truoc day 24 trang da tung in ra "... | Offerdy | Offerdy".
  // OpenGraph thi nguoc lai — no KHONG di qua titleTemplate nen phai tu mang thuong hieu.
  const title = post.metaTitle ?? post.title
  const description = post.metaDescription ?? post.excerpt ?? `Read ${post.title} on Offerdy.`
  const url = `${BASE}/blog/${slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — Offerdy`,
      description,
      url,
      siteName: 'Offerdy',
      type: 'article',
      publishedTime: post.date ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
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
  const [post, allPosts, globalConfig, authorConfig] = await Promise.all([
    getPostBySlug(slug),
    getPosts(),
    getConfigContent(),
    getConfigAuthor(),
  ])

  if (!post) notFound()

  /**
   * Than bai duoc dung LUC GOI TRANG, qua hai buoc, va **thu tu la bat buoc**:
   *
   *   1. `renderPostTokens` — thay `[CTA:n]`, `[IMAGE:n]`, `[TABLE]`, `[PRICE:n]`...
   *   2. `getStoreRefForHtml` — gan tham so tiep thi vao MOI the <a> trong bai.
   *
   * ⚠️ Doi thu tu la hong: chinh `[CTA:n]` sinh ra cac the <a> ra merchant, nen gan
   * ref truoc thi luc do chung chua ton tai va ca bai di ra ngoai KHONG mang ref —
   * dung lai loi da lam 8/23 review mat hoa hong.
   *
   * Giai luc goi trang chu khong luc luu: doi ma ref cua mot store la ca kho bai cu
   * cap nhat theo; ma giam het han thi cau nhac ma tu bien mat; gia thi luon di kem
   * moc "chup luc nao". Bai luu san HTML la bai dong bang su that cua ngay viet.
   */
  // `post` den tu GROQ nen khong co kieu — khai ro cac truong bai viet AI dung toi.
  const article: {
    content?: string
    articleProducts?: RenderProduct[]
    comparisonRows?: { label: string; values: string[] }[]
    faq?: { question: string; answer: string }[]
    notAnswered?: string[]
    sourceStore?: { name?: string; slug?: string }
  } = post
  const products: RenderProduct[] = article.articleProducts ?? []
  const faq = article.faq ?? []
  const notAnswered = article.notAnswered ?? []
  // Ma giam doc LUC GOI TRANG, khong phai luc viet bai: ma het han sau khi dang thi
  // cau nhac ma tu bien mat cung the boc cua no.
  const coupon = article.sourceStore?.slug ? await getStoreTopCoupon(article.sourceStore.slug) : null

  const rendered = typeof article.content === 'string'
    ? renderPostTokens(article.content, {
        products,
        comparisonRows: article.comparisonRows,
        coupon,
        storeName: article.sourceStore?.name,
      })
    : undefined

  const articleHtml = await getStoreRefForHtml(rendered)
  const capturedNote = priceNote(products)

  const authorName = post.author || authorConfig.defaultName
  const authorTwitterUrl = authorConfig.twitterHandle
    ? `https://x.com/${authorConfig.twitterHandle.replace(/^@/, '')}`
    : undefined

  /**
   * O ben canh: bai LIEN QUAN truoc, roi moi toi bai moi.
   *
   * "Recent Posts" hien y het nhau tren moi trang bai — no khong biet nguoi doc dang
   * doc gi, nen khong dua duoc ai di dau. Cung cho ay ma hien bai cung shop / cung chu
   * de thi moi cu bam la mot nguoi con dang trong con mua sam. Hai o rieng chu khong
   * tron: xem `pickSidebarPosts` de biet vi sao.
   */
  const candidates: SidebarPost[] = allPosts.length ? allPosts : staticPosts
  const sidebar = pickSidebarPosts(
    { slug, title: post.title, category: post.category, storeSlug: article.sourceStore?.slug },
    candidates
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt ?? undefined,
        author: authorName ? { '@type': 'Person', name: authorName, url: `${BASE}/author`, sameAs: authorTwitterUrl ? [authorTwitterUrl] : undefined } : undefined,
        datePublished: post.date ?? undefined,
        dateModified: post.updatedAt ?? post.date ?? undefined,
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
      // ⚠️ KHONG phat `Review`/`Product` o day. Loai `post` la mot bai so sanh nhieu
      // san pham; khai `Review` la noi voi Google "day la danh gia MOT san pham, cham
      // N sao" — sai su that va trai quy dinh review snippet. Xem muc "Category
      // articles go in post / Comparison" trong file nay.
      ...(faq.length
        ? [{
            '@type': 'FAQPage',
            mainEntity: faq.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }]
        : []),
      ...(products.length
        ? [{
            '@type': 'ItemList',
            itemListElement: products.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              // ⚠️ **KHONG co `offers`.** Gia trong du lieu co cau truc lech gia that
              // cua shop la loi rich-result, ma `priceAtWriting` bat dau troi ngay tu
              // hom dang. Gia hien trong HTML thi khac: da co dong "gia tai thoi diem
              // viet" ganh.
              item: { '@type': 'Product', name: p.title, url: p.url, image: p.imageUrl || undefined },
            })),
          }]
        : []),
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
              <span className={`blog-cat ${catClass(post.category)}`}>
                {post.category}
              </span>
            </div>

            <h1 className="article-title">{post.title}</h1>

            <div className="article-meta">
              {authorName && <span>✍️ {authorName}</span>}
              <span>📅 {post.date}</span>
              <span>⏱ {post.readTime} min read</span>
            </div>

            {/* ⚠️ Khung VUONG + `contain`. Truoc day la 21/9 + `cover` — mot ty le
                phong canh ap len anh SAN PHAM, nen no cat mat dau va chan cai ao, cat
                doi chai son. Anh Shopify gan nhu luon vuong nen khung vuong vua khop;
                `contain` lo not cac anh le ty le khac. */}
            <div className="article-hero-img" style={post.imageUrl
              ? { position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#fff' }
              : { background: post.coverBg }
            }>
              {post.imageUrl
                ? <Image src={post.imageUrl} alt={post.title} fill sizes="(max-width: 900px) 100vw, 520px" style={{ objectFit: 'contain' }} priority />
                : post.coverEmoji}
            </div>

            {/* Hop ma giam nam TREN than bai: nguoi doc toi tu Google thuong chi
                cuon mot man hinh. Loi van noi dung muc do biet — day la ma TOAN SHOP,
                khong phai ma rieng cho san pham nao trong bai. */}
            {coupon?.code && (
              <div style={{ padding: '0 clamp(16px, 4vw, 40px)' }}>
                <ReviewCouponBox
                  code={coupon.code}
                  heading={`${article.sourceStore?.name ?? 'This shop'} discount code`}
                  sub="Store-wide code — try it at checkout; some shops exclude items already on sale."
                />
              </div>
            )}

            <div className="article-body">
              {articleHtml && articleHtml.length > 100 ? (
                <div dangerouslySetInnerHTML={{ __html: articleHtml }} />
              ) : 'body' in post && Array.isArray((post as { body?: unknown[] }).body) && (post as { body: unknown[] }).body.length > 0 ? (
                <PortableBody body={(post as { body: unknown[] }).body} />
              ) : (
                <PlaceholderBody category={post.category} />
              )}
              {/* Gia trong bai la gia CHUP LAI luc viet. Noi ro moc do la cach duy
                  nhat hien gia ma khong gia vo do la gia thoi gian thuc. */}
              {capturedNote && (
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 18 }}>{capturedNote}</p>
              )}
            </div>

            {/*
              Bai KHONG tra loi duoc gi.
              ⚠️ Cau dan la chuoi CO DINH do code viet, khong bao gio do model — mot cau
              co dinh thi khong the bia, va no noi ra phuong phap, dung viec ma
              `priceNote()` dang lam cho gia.
              ⚠️ Va no KHONG di vao `FAQPage` JSON-LD: `acceptedAnswer` bat buoc phai co
              cau tra loi, ma day theo dinh nghia la cau KHONG co cau tra loi.
              Rong thi khong dung the — khong de lai mot khung khong (41 bai cu deu rong).
            */}
            {notAnswered.length > 0 && (
              <div className="article-unanswered">
                <h2>What this guide can&rsquo;t tell you</h2>
                <p>
                  Everything above comes from {article.sourceStore?.name ?? 'the shop'}&rsquo;s own
                  product pages. These are the questions those pages don&rsquo;t answer:
                </p>
                <ul>
                  {notAnswered.map(q => <li key={q}>{q}</li>)}
                </ul>
              </div>
            )}

            {(globalConfig.articleDisclaimer || globalConfig.articleReviewedBy) && (
              <div className="article-disclaimer">
                {globalConfig.articleDisclaimer && (
                  <p dangerouslySetInnerHTML={{ __html: globalConfig.articleDisclaimer.replace(/\{site\}/g, 'Offerdy').replace(/\{store\}/g, '<span style="color:#16a34a;font-weight:700">the store</span>') }} />
                )}
                {globalConfig.articleReviewedBy && (
                  <p className="article-disclaimer-meta">
                    {(post.updatedAt || post.date) && `Last updated: ${fmtDate(post.updatedAt ?? post.date)} · `}{globalConfig.articleReviewedBy}
                  </p>
                )}
              </div>
            )}

            {authorName && authorConfig.bio && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 24, padding: '18px 20px', border: '1px solid var(--border)', borderRadius: 12 }}>
                {authorConfig.avatarUrl && (
                  <Image src={authorConfig.avatarUrl} alt={authorName} width={48} height={48} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    <Link href="/author" style={{ color: 'inherit' }}>{authorName}</Link>{authorConfig.role && <span style={{ fontWeight: 500, color: 'var(--muted)' }}> · {authorConfig.role}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.6 }}>{authorConfig.bio}</p>
                </div>
              </div>
            )}
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="article-sidebar">
            <SidebarBox title="Related Posts" posts={sidebar.related} />
            <SidebarBox title="Recent Posts" posts={sidebar.recent} />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  )
}

/** Mot o trong cot ben. O rong thi khong dung the — khong de lai mot khung khong. */
function SidebarBox({ title, posts }: { title: string; posts: SidebarPost[] }) {
  if (!posts.length) return null
  return (
    <div className="asb-box">
      <div className="asb-title">{title}</div>
      {posts.map(p => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="asb-card">
          {/* Vuong 96px y nhu sidebar review. Khung 128x64 cu la khung BANNER: anh bia
              gio la anh SAN PHAM, va o ngang det cat mat dau/chan mon hang — dung loi
              ma anh bia trong than bai da phai sua. */}
          <div className="asb-thumb" style={{ background: p.imageUrl ? undefined : (p.coverBg ?? 'var(--bg)'), fontSize: 28 }}>
            {p.imageUrl
              ? <Image src={p.imageUrl} alt={p.title} fill sizes="96px" style={{ objectFit: 'cover' }} />
              : (p.coverEmoji ?? '📝')}
          </div>
          <div className="asb-info">
            <div className="asb-name">{p.title}</div>
            {p.category && <span className="asb-tag">{p.category}</span>}
          </div>
        </Link>
      ))}
    </div>
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
