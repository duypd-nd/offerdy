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
  // `?? 'local'` — xem giai thich o sentry.server.config.ts. Phia trinh duyet
  // con mot duong ro nua ma server khong co: script lai Chrome cua chinh minh
  // chay vao production that. Loi `Clipboard: Document is not focused` tren
  // offerdy.com/coupon-codes la do HeadlessChrome cua mot phep do, khong phai
  // khach — nhan `environment` khong tach duoc no, chi co User-Agent moi tach
  // duoc. Chua lam; ghi lai de lan sau khong ket luan nham.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
