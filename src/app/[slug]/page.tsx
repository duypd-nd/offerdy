import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getPageBySlug } from '@/sanity/queries'

export const revalidate = 60

// Bat buoc phai co ham nay (du tra ve mang rong) thi revalidate o tren moi
// thuc su co hieu luc voi route dynamic [slug] - xem stores/[slug]/page.tsx
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return {}
  return {
    title: page.title,
    description: page.excerpt ?? undefined,
  }
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page) notFound()

  return (
    <>
      <HeaderWrapper />
      <main>
        {/* Hero */}
        <div style={{
          background: page.imageUrl
            ? `linear-gradient(rgba(15,25,41,.55),rgba(15,25,41,.7)), url(${page.imageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 50%,#ecfdf5 100%)',
          padding: page.imageUrl ? '72px 24px 64px' : '56px 24px 48px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <h1 style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: 'clamp(28px, 5vw, 46px)',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              color: page.imageUrl ? '#ffffff' : '#0f1929',
              marginBottom: page.excerpt ? 16 : 0,
              textWrap: 'balance',
            } as React.CSSProperties}>{page.title}</h1>

            {page.excerpt && (
              <p style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: page.imageUrl ? 'rgba(255,255,255,.82)' : '#4b5563',
                maxWidth: 600,
                margin: 0,
              }}>{page.excerpt}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
          {page.content ? (
            <div className="article-body" dangerouslySetInnerHTML={{ __html: page.content }} />
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ fontSize: 16 }}>Nội dung đang được cập nhật.</p>
            </div>
          )}

          <div style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#9ca3af',
          }}>
            Cập nhật: {new Date(page._updatedAt).toLocaleDateString('vi-VN', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
