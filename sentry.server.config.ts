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
  //
  // ⚠️ `?? 'local'` chu KHONG phai `?? process.env.NODE_ENV`. Cai cu la nguon
  // rac lon nhat cua the do "Loi production chua xu ly": `npm run build` roi
  // `npm start` tren may nay dat NODE_ENV=production (nen `enabled` o tren bat)
  // trong khi VERCEL_ENV khong ton tai — the la loi tu localhost mang dung nhan
  // `production`. Do 2026-08-25 tren 7 issue dang mo: 5 khong phai loi trang
  // that, trong do 2 den tu chinh may nay (localhost:3000/admin va
  // localhost:3399/admin/users goi bang curl).
  //
  // Vi sao khong tat han bang `enabled`: mot ngay nao do VERCEL_ENV khong den
  // duoc runtime thi cach nay chi lam event mang nhan sai — van gui, van xem
  // duoc — con tat `enabled` thi mat trang giam sat ma khong ai hay.
  environment: process.env.VERCEL_ENV ?? 'local',
})
