'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', background: '#0F1929', padding: 24,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px 44px', maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f1929', marginBottom: 10 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#6B7694', lineHeight: 1.6, marginBottom: 24 }}>
              We&apos;ve been notified and are looking into it. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#22C55E', color: '#0f1929', border: 'none',
                fontSize: 14, fontWeight: 700, padding: '10px 24px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
