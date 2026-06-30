import Link from 'next/link'
import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: 'var(--navy)' }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,.4)',
        }}>

          {/* top half */}
          <div style={{ padding: '40px 44px 32px' }}>
            {/* brand row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{
                width: 28, height: 28, background: 'var(--green)', borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, color: 'var(--navy)', letterSpacing: '-.5px', flexShrink: 0,
              }}>O</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Offerdy</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>offerdy.com</div>
              </div>
            </div>

            {/* 404 + expired stamp */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--light)', marginBottom: 6 }}>
                  Error code
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ fontSize: 64, fontWeight: 900, color: 'var(--navy)', lineHeight: 1, letterSpacing: -3 }}>404</span>
                  <span style={{
                    position: 'absolute', left: -4, right: -4, top: '50%',
                    height: 4, background: '#ef4444', borderRadius: 2,
                    transform: 'translateY(-50%) rotate(-8deg)', display: 'block',
                  }} />
                </div>
              </div>
              <div style={{
                flexShrink: 0, marginTop: 6,
                border: '2.5px solid #ef4444', color: '#ef4444',
                fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
                padding: '4px 9px', borderRadius: 5, transform: 'rotate(6deg)',
                display: 'inline-block', opacity: .85,
              }}>Expired</div>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.25, marginBottom: 10, letterSpacing: '-.3px' }}>
              This page has expired (or never existed)
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 400 }}>
              The URL you followed might be a broken link, a mistyped address,
              or a page that was removed. Our deals are still very much alive though.
            </p>
          </div>

          {/* dashed tear line */}
          <div style={{ position: 'relative', borderTop: '2px dashed #D8E2EE', margin: '0 -16px' }}>
            <span style={{ position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, background: 'var(--navy)', borderRadius: '50%', display: 'block' }} />
            <span style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, background: 'var(--navy)', borderRadius: '50%', display: 'block' }} />
          </div>

          {/* bottom half */}
          <div style={{ padding: '28px 44px 36px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/deals" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', color: 'var(--navy)',
                fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
              }}>
                Browse Deals →
              </Link>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: 'var(--muted)',
                fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
                border: '1.5px solid #D8E2EE', textDecoration: 'none',
              }}>
                ← Go Home
              </Link>
            </div>
          </div>

          {/* footer bar */}
          <div style={{
            background: '#F8FAFC', borderTop: '1px solid #D8E2EE',
            padding: '14px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12, color: 'var(--light)',
          }}>
            <span>offerdy.com</span>
            <span>Error <strong style={{ color: 'var(--muted)' }}>404</strong> · Page Not Found</span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
