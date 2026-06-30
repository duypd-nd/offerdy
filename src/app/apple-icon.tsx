import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#0F1929',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1,
              letterSpacing: '-4px',
              fontFamily: 'sans-serif',
            }}
          >
            O
          </span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: '#22C55E',
              lineHeight: 1,
              letterSpacing: '-2px',
              fontFamily: 'sans-serif',
            }}
          >
            dy
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
