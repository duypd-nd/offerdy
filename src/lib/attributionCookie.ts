import type { ShortLinkSource } from './shortLinkSource'

/**
 * Phan THUAN cua phep gan nguon: ten cookie, doc/ghi chuoi, tuy chon cookie.
 *
 * VI SAO TACH KHOI `attribution.ts`: file do import `next/headers`, thu KHONG
 * ton tai trong middleware (middleware chay o edge runtime va doc cookie qua
 * `request.cookies`). Nhap thang `attribution.ts` vao middleware se keo
 * `next/headers` vao bundle edge.
 *
 * Tach ra day de CA HAI phia dung chung MOT bo ma hoa/giai ma. Neu middleware tu
 * viet lay phep doc chuoi "source|campaign|code" thi se co hai ban, va cho lech
 * o day nghia la click bi gan sai nguon — mot loi khong bao gio lo ra o build hay
 * o test, chi lo ra khi doc bao cao thay so vo ly.
 *
 * `attribution.ts` xuat lai moi thu o day, nen cac file dang nhap tu do
 * (`/d/`, `/g/`, `trackClick.ts`) khong phai sua gi.
 */

export const ATTRIBUTION_COOKIE = 'ofd_src'

// 7 ngay: du cho "thay tren Instagram toi nay, mai mo lai mua", nhung khong dai
// den muc gan mot don hang thang sau cho mot bai dang da cu.
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export type Attribution = {
  source: ShortLinkSource
  campaign?: string
  /** Ma san pham cua short link dua khach vao — de biet bai dang nao mo dau. */
  entryCode?: number
}

// Dinh dang phang "source|campaign|code" thay vi JSON: gia tri nay di qua header
// Cookie, JSON phai encode/decode lam chuoi dai va de vo hon.
export function serializeAttribution(a: Attribution): string {
  return [a.source, a.campaign ?? '', a.entryCode ?? ''].join('|')
}

export function parseAttribution(raw: string): Attribution | null {
  const [source, campaign, code] = raw.split('|')
  if (!source) return null
  const entryCode = code ? Number(code) : undefined
  return {
    source: source as ShortLinkSource,
    campaign: campaign || undefined,
    entryCode: Number.isSafeInteger(entryCode) ? entryCode : undefined,
  }
}

export const attributionCookieOptions = {
  maxAge: MAX_AGE_SECONDS,
  httpOnly: true,
  // Lax (khong phai Strict): khach den TU mot site khac (Instagram), Strict se
  // khong gui cookie o dieu huong dau tien va lam mat luon phep gan nguon.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
