import Link from 'next/link'
import { getSiteSettings } from '@/sanity/queries'
import type { FooterColumn, SocialLink } from '@/data/siteSettings'

function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes('facebook'))
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  if (p.includes('x') || p.includes('twitter'))
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  if (p.includes('instagram'))
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  if (p.includes('youtube'))
    return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="var(--navy-2,#162236)"/></svg>
  if (p.includes('linkedin'))
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
  if (p.includes('tiktok'))
    return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.75a4.85 4.85 0 0 1-1-.06z"/></svg>
  if (p.includes('pinterest'))
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.44 7.63 11.22-.1-.95-.2-2.4.04-3.44.22-.93 1.46-6.18 1.46-6.18s-.37-.75-.37-1.85c0-1.74 1-3.04 2.25-3.04 1.06 0 1.57.8 1.57 1.75 0 1.07-.68 2.67-1.03 4.15-.3 1.24.61 2.25 1.82 2.25 2.18 0 3.64-2.78 3.64-6.07 0-2.5-1.68-4.36-4.72-4.36-3.44 0-5.6 2.57-5.6 5.44 0 .98.29 1.67.74 2.2.21.25.24.34.16.63-.05.2-.18.7-.23.9-.07.28-.29.38-.53.28-1.48-.6-2.17-2.22-2.17-4.04 0-3.16 2.66-6.92 7.95-6.92 4.26 0 7.07 3.1 7.07 6.43 0 4.4-2.44 7.7-6.04 7.7-1.2 0-2.34-.65-2.73-1.38l-.76 2.93c-.27 1.02-1 2.3-1.5 3.08.98.3 2.01.46 3.08.46 6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>
  if (p.includes('telegram'))
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
  return <span style={{ fontSize: 13, fontWeight: 700 }}>{platform[0]}</span>
}

export default async function Footer() {
  const settings = await getSiteSettings()

  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="logo">
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  height={34}
                  style={{ maxWidth: 140, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                />
              ) : (
                <>
                  <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
                    <rect width="36" height="36" rx="8" fill="#22C55E" />
                    <path d="M8 12C8 10.343 9.343 9 11 9H19.5L28 17.5V27C28 28.657 26.657 30 25 30H11C9.343 30 8 28.657 8 27V12Z" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.5" />
                    <circle cx="13.5" cy="14.5" r="2" fill="white" />
                    <path d="M19.5 9V17.5H28" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M12 21.5H17M12 24.5H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="logo-text">
                    <span style={{ color: 'white' }}>Offer</span>
                    <span className="dy">dy</span>
                  </span>
                </>
              )}
            </Link>
            <p>{settings.tagline}</p>
          </div>

          {settings.footerColumns.map((col: FooterColumn, i: number) => (
            <div key={i} className="footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link, j) => {
                  const href = link.url.startsWith('http') || link.url.startsWith('/') ? link.url : `/${link.url}`
                  return <li key={j}><Link href={href}>{link.label}</Link></li>
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">{settings.copyrightText}</div>
          <div className="footer-social">
            {settings.socialMedia.map((soc: SocialLink, i: number) => {
              const href = soc.url.startsWith('http') || soc.url.startsWith('/') ? soc.url : `/${soc.url}`
              return (
                <Link key={i} href={href} className="soc" aria-label={soc.platform}>
                  <SocialIcon platform={soc.platform} />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
