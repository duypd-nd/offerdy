import { cookies } from 'next/headers'
import type { ShortLinkSource } from './shortLinkSource'

/**
 * Gan nguon cho click affiliate xay ra SAU khi khach vao tu short link.
 *
 * Van de: /d/1005 biet khach den tu Instagram (UA/referer), nhung cu chi bam
 * "Get Deal" o mot request KHAC — luc do khong con tin hieu nao ca (webview
 * khong gui referer noi bo, va referer noi bo cung chi la trang deal cua minh).
 * Khong noi hai buoc lai thi chi biet "Instagram cho bao nhieu luot XEM", khong
 * bao gio biet "Instagram cho bao nhieu luot BAM sang merchant".
 *
 * Cach noi: /d/ va /g/ dat mot cookie first-party ghi nguon; cac ham track click
 * doc lai cookie do va luu vao ban ghi click. Khong dung localStorage vi server
 * action can doc duoc gia tri nay.
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

function parseAttribution(raw: string): Attribution | null {
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

/** Doc cookie gan nguon. Dung trong server action / route handler. */
export async function readAttribution(): Promise<Attribution | null> {
  try {
    const raw = (await cookies()).get(ATTRIBUTION_COOKIE)?.value
    return raw ? parseAttribution(raw) : null
  } catch {
    // cookies() throw khi goi ngoai request scope — telemetry khong duoc lam vo luong
    return null
  }
}
