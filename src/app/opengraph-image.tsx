import { ImageResponse } from 'next/og'
import { getSiteName, getConfigSeo } from '@/sanity/queries'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// ⚠️ `alt` PHAI la hang so tinh — Next.js doc no luc build, khong goi ham duoc.
// Nen o day co y KHONG nhac ten website: mot cau khong ten thi khong bao gio cu,
// con go cung ten thi doi ten xong la sai. Chu tren chinh anh van lay ten that.
export const alt = 'Real deals. Actually verified.'

export default async function OgImage() {
  const [seo, siteName] = await Promise.all([getConfigSeo(), getSiteName()])

  if (seo.defaultOgImageUrl) {
    return new ImageResponse(
      (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={seo.defaultOgImageUrl}
          width={size.width}
          height={size.height}
          style={{ objectFit: 'cover' }}
          alt=""
        />
      ),
      { ...size }
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0F1929',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.06)',
            display: 'flex',
          }}
        />

        {/* Tag icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: '#22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="7" y1="7" x2="7.01" y2="7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-4px',
              fontFamily: 'sans-serif',
              lineHeight: 1,
            }}
          >
            {siteName.slice(0, Math.max(1, siteName.length - 2))}
          </span>
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: '#22C55E',
              letterSpacing: '-4px',
              fontFamily: 'sans-serif',
              lineHeight: 1,
            }}
          >
            {siteName.slice(Math.max(1, siteName.length - 2))}
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'sans-serif',
            fontWeight: 400,
            letterSpacing: '0.5px',
          }}
        >
          Real Deals. Actually Verified.
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#22C55E',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
