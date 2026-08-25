/**
 * Doc dia chi goc cua site tu o *Canonical URL* trong `/admin/config/seo`.
 *
 * ⚠️ VI SAO KHONG PHAI MOT DONG `new URL(seo.canonicalUrl ?? MAC_DINH)`.
 *
 * O nay quyet dinh `metadataBase`, tuc la goc cua MOI dia chi tuyet doi ma
 * Next sinh ra: canonical, og:url, anh xem truoc. Mot gia tri hong o day khong
 * lam trang sap — no lam ca site khai bao dia chi cua mot ten mien khac, im
 * lang, tren tung trang.
 *
 * Va `try/catch` mot minh KHONG du. Do that bang Node 24 (2026-08-26):
 *
 *   'https://.offerdy.com/'   -> HOP LE, hostname = '.offerdy.com'
 *   'https://abc'             -> HOP LE, hostname = 'abc'
 *   'https://offerdy.com.'    -> HOP LE, hostname = 'offerdy.com.'
 *   'abc' / '' / '//x.com'    -> nem ERR_INVALID_URL
 *
 * Dong dau tien la gia tri THAT SU da nam trong dataset cho toi 25/08 — no
 * qua duoc `new URL`. Nen phai soi rieng hostname: moi nhan phai khong rong,
 * va phai co it nhat hai nhan (khong nhan `localhost` tran, khong `https://abc`).
 *
 * Khong bao gio nem: nguoi van hanh go nham mot o cau hinh thi phai duoc thay
 * trang mang dia chi mac dinh, chu khong phai mot trang 500. `generateMetadata`
 * chay tren MOI trang.
 */

/** Dia chi that cua site — duong lui khi o cau hinh trong hoac hong. */
export const SITE_URL_MAC_DINH = 'https://www.offerdy.com'

/** Hostname co dung hinh mot ten mien that khong. */
function hostHopLe(hostname: string): boolean {
  const nhan = hostname.split('.')
  if (nhan.length < 2) return false
  return nhan.every(n => n.length > 0)
}

/**
 * Tra ve dia chi goc dung duoc, hoac `SITE_URL_MAC_DINH` neu o cau hinh khong
 * dung. Luon tra ve chuoi khong co dau `/` o cuoi de noi duoc voi duong dan.
 */
export function siteBaseUrl(canonicalUrl?: string | null): string {
  const raw = canonicalUrl?.trim()
  if (!raw) return SITE_URL_MAC_DINH

  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return SITE_URL_MAC_DINH
  }

  // Chi http/https. `javascript:` va `data:` cung parse duoc — chung khong bao
  // gio la dia chi goc cua mot trang web, va de nguyen thi chung di thang vao
  // the <link rel="canonical">.
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return SITE_URL_MAC_DINH
  if (!hostHopLe(u.hostname)) return SITE_URL_MAC_DINH

  // Bo duong dan/query/hash: day la GOC, khong phai mot trang. Giu nguyen cong
  // neu co (moi truong dung thu hay dung toi).
  return `${u.protocol}//${u.host}`
}
