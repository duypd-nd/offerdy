/**
 * Xac thuc request tu Vercel Cron, dung chung cho ca 3 cron route.
 *
 * Vercel gan `Authorization: Bearer <CRON_SECRET>` vao request cron NEU bien
 * CRON_SECRET ton tai. Truoc day moi route tu so sanh mot dong, va khi khong khop
 * thi chi tra 401 rong — khong the biet hong o dau. Thuc te da xay ra: ca 3 cron
 * im lang suot 18 ngay, dashboard bao "Enabled", bien CRON_SECRET co that, ma log
 * chi hien `GET 401` khong kem thong tin gi.
 *
 * Nen o day:
 * 1. `trim()` ca hai ve — gia tri dan vao o nhap cua Vercel rat de dinh khoang
 *    trang/xuong dong o cuoi, va do la loi khong the nhin thay bang mat.
 * 2. Khi that bai thi GHI LOG mot ban chan doan khong lo bi mat (chi co/khong co,
 *    do dai, tien to) — log cua Vercel la rieng tu, con response tra ra ngoai van
 *    khong noi gi them. Do dai la thu phan biet duoc "sai gia tri" voi "thua mot
 *    ky tu trang".
 */
export type CronAuthResult =
  | { ok: true }
  | { ok: false; response: Response }

export function verifyCronRequest(request: Request, routeName: string): CronAuthResult {
  const secret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')?.trim()
  const expected = secret ? `Bearer ${secret}` : null

  if (expected && authHeader === expected) return { ok: true }

  // console.error -> hien trong Vercel Logs (loc theo requestPath cua cron).
  // KHONG bao gio in gia tri that cua secret hay header.
  console.error('[cron] auth failed', JSON.stringify({
    route: routeName,
    hasSecret: !!secret,
    secretLength: secret?.length ?? 0,
    hasAuthHeader: !!authHeader,
    authHeaderLength: authHeader?.length ?? 0,
    // "Bearer " = Vercel co gan token; khac di la mot nguon khac goi vao
    authHeaderPrefix: authHeader?.slice(0, 7) ?? null,
    // vercel-cron/1.0 = request that su den tu bo lich cua Vercel
    userAgent: request.headers.get('user-agent')?.slice(0, 60) ?? null,
    // Do dai lech dung 1-2 ky tu = gan nhu chac chan thua khoang trang/xuong dong
    lengthMatches: !!secret && !!authHeader && authHeader.length === (secret.length + 7),
  }))

  return {
    ok: false,
    response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}
