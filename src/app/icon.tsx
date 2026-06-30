import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
