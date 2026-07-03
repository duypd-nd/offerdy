import { ImageResponse } from 'next/og'
import { getFaviconUrl } from '@/sanity/queries'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const faviconUrl = await getFaviconUrl()

  if (faviconUrl) {
    return new ImageResponse(
      (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={faviconUrl} width={32} height={32} style={{ borderRadius: 8 }} alt="" />
      ),
      { ...size }
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0F1929',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#22C55E',
            lineHeight: 1,
            letterSpacing: '-1px',
            fontFamily: 'sans-serif',
          }}
        >
          O
        </div>
      </div>
    ),
    { ...size }
  )
}
