import { cookies } from 'next/headers'
import { ATTRIBUTION_COOKIE, parseAttribution } from './attributionCookie'

/**
 * Gan nguon cho click affiliate xay ra SAU khi khach vao tu short link.
 *
 * Van de: /d/1005 biet khach den tu Instagram (UA/referer), nhung cu chi bam
 * "Get Deal" o mot request KHAC — luc do khong con tin hieu nao ca (webview
 * khong gui referer noi bo, va referer noi bo cung chi la trang deal cua minh).
 * Khong noi hai buoc lai thi chi biet "Instagram cho bao nhieu luot XEM", khong
 * bao gio biet "Instagram cho bao nhieu luot BAM sang merchant".
 *
 * Cach noi: cookie first-party ghi nguon; cac ham track click doc lai cookie do
 * va luu vao ban ghi click. Khong dung localStorage vi server action can doc
 * duoc gia tri nay.
 *
 * BA cho dat cookie do, khong con hai:
 *   - `/d/[code]` va `/g/[code]` — short link, biet ca `entryCode`
 *   - `src/middleware.ts` — MOI trang dich khac (blog, review, store) khi URL
 *     mang `?s=` hoac click-id cua Google Ads. Khong co no thi quang cao dan
 *     thang vao /blog/... se khong gan duoc nguon cho cu bam sang merchant.
 *
 * ⚠️ Phan thuan (ten cookie, doc/ghi chuoi, tuy chon cookie) nam o
 * `attributionCookie.ts` vi middleware KHONG dung duoc `next/headers`. File nay
 * xuat lai toan bo — dung nhap tu day trong middleware.
 */
export {
  ATTRIBUTION_COOKIE,
  attributionCookieOptions,
  parseAttribution,
  serializeAttribution,
  type Attribution,
} from './attributionCookie'

/** Doc cookie gan nguon. Dung trong server action / route handler. */
export async function readAttribution() {
  try {
    const raw = (await cookies()).get(ATTRIBUTION_COOKIE)?.value
    return raw ? parseAttribution(raw) : null
  } catch {
    // cookies() throw khi goi ngoai request scope — telemetry khong duoc lam vo luong
    return null
  }
}
