import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enableLogs: true,
  debug: false,
  // Xem giai thich day du o sentry.server.config.ts
  enabled: process.env.NODE_ENV === 'production',
  // Phia trinh duyet KHONG doc duoc VERCEL_ENV (chi bien NEXT_PUBLIC_* moi duoc
  // nhung vao bundle) — Vercel co san NEXT_PUBLIC_VERCEL_ENV cho muc dich nay.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
