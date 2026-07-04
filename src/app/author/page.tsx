import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getConfigAuthor } from '@/sanity/queries'

export const revalidate = 60

const BASE = 'https://www.offerdy.com'

const FALLBACK = {
  defaultName: 'Offerdy Editorial',
  role: 'Editor',
  bio: "Offerdy's editorial team researches and verifies the best deals, coupon codes, and promotions from top brands.",
  experienceBio: '',
  verificationProcess: '',
  email: 'contact@offerdy.com',
}

export async function generateMetadata(): Promise<Metadata> {
  const a = await getConfigAuthor()
  const name = a.defaultName || FALLBACK.defaultName
  const title = `${name} — ${a.role || FALLBACK.role} at Offerdy`
  const description = a.bio || FALLBACK.bio
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/author` },
    openGraph: { title, description, url: `${BASE}/author`, type: 'profile' },
  }
}

export default async function AuthorPage() {
  const a = await getConfigAuthor()
  const name = a.defaultName || FALLBACK.defaultName
  const role = a.role || FALLBACK.role
  const bio = a.bio || FALLBACK.bio
  const experienceParas = (a.experienceBio || FALLBACK.experienceBio).split('\n\n').filter(Boolean)
  const verificationProcess = a.verificationProcess || FALLBACK.verificationProcess
  const email = a.email || FALLBACK.email
  const twitterUrl = a.twitterHandle ? `https://x.com/${a.twitterHandle.replace(/^@/, '')}` : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${BASE}/author#person`,
        name,
        jobTitle: role,
        description: bio,
        url: `${BASE}/author`,
        email: email ? `mailto:${email}` : undefined,
        sameAs: twitterUrl ? [twitterUrl] : undefined,
        worksFor: { '@type': 'Organization', name: 'Offerdy', url: BASE },
      },
      {
        '@type': 'WebPage',
        '@id': `${BASE}/author#webpage`,
        url: `${BASE}/author`,
        name: `${name} — ${role} at Offerdy`,
        description: bio,
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 96px' }}>

          {/* Hero */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Who writes Offerdy
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            {a.avatarUrl ? (
              <Image src={a.avatarUrl} alt={name} width={76} height={76} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '1.5px solid rgba(34,197,94,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: 'var(--green-dark)', flexShrink: 0 }}>
                {name.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 'clamp(24px,4.5vw,34px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.15, letterSpacing: '-.6px', marginBottom: 4 }}>{name}</h1>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>{role} · Offerdy</div>
            </div>
          </div>

          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.72, maxWidth: 620, marginBottom: 48 }}>{bio}</p>

          {/* Background / experience */}
          {experienceParas.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', marginBottom: 16 }}>My background</h2>
              <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 'clamp(24px,5vw,32px)', boxShadow: '0 2px 8px rgba(15,25,41,.04)' }}>
                {experienceParas.map((p, i) => (
                  <p key={i} style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, marginBottom: i < experienceParas.length - 1 ? 16 : 0 }}>{p}</p>
                ))}
              </div>
            </section>
          )}

          {/* Verification process */}
          {verificationProcess && (
            <section style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', marginBottom: 16 }}>How I verify every deal</h2>
              <div style={{ background: 'var(--navy)', borderRadius: 18, padding: 'clamp(24px,5vw,32px)' }}>
                <p style={{ fontSize: 15, color: '#C9D4E5', lineHeight: 1.8, marginBottom: 18 }}>{verificationProcess}</p>
                <Link href="/about" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>See our full verification process →</Link>
              </div>
            </section>
          )}

          {/* Corrections & contact */}
          <section style={{ marginBottom: 52 }}>
            <div style={{ background: 'var(--green-50)', border: '1.5px solid #BBF7D0', borderRadius: 16, padding: '28px 32px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-dark)', marginBottom: 8 }}>Found an expired or broken code?</div>
              <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.7, marginBottom: 14 }}>
                Email me directly and I&rsquo;ll check it and fix the listing.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <a href={`mailto:${email}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>{email}</a>
                {twitterUrl && <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-dark)' }}>Follow on X →</a>}
              </div>
            </div>
          </section>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/deals" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 22px', borderRadius: 9, textDecoration: 'none' }}>Browse Deals</Link>
            <Link href="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9, border: '1.5px solid var(--border)', textDecoration: 'none' }}>About Offerdy</Link>
            <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--muted)', fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9, border: '1.5px solid var(--border)', textDecoration: 'none' }}>Read the Blog</Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
