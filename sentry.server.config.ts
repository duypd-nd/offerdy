import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enableLogs: true,
  debug: false,
  // Tat o may local. Truoc day khong co dong nay nen moi loi phat sinh khi chay
  // `npm run dev` deu bay thang vao project Sentry PRODUCTION — khong chi gay
  // nhieu khi nhin danh sach, ma AI Daily Report DOC Sentry nen rac tu may dev
  // truc tiep lam sai muc "loi production chua xu ly" va cac de xuat hanh dong.
  // NODE_ENV la moc dung: `npm run dev` -> development; build tren Vercel (ca
  // production lan preview) -> production.
  enabled: process.env.NODE_ENV === 'production',
  // Tach preview khoi production de con loc duoc — xem getRecentSentryIssues().
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
})
