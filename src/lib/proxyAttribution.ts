import { NextResponse, type NextRequest } from 'next/server'
import {
  ATTRIBUTION_COOKIE, attributionCookieOptions, parseAttribution, serializeAttribution,
} from './attributionCookie'
import { detectShortLinkSource, hasGoogleAdsClickId, isLikelyBot, parseCampaign } from './shortLinkSource'

/**
 * Gan nguon cho MOI trang dich, khong chi short link.
 *
 * VAN DE NO GIAI: cookie gan nguon truoc day chi duoc dat o `/d/[code]` va
 * `/g/[code]`. Quang cao Google dan thang vao `/blog/<slug>` hay `/stores/<slug>`
 * thi cu bam "Get Deal" xay ra o mot request KHAC va khong con tin hieu nao —
 * `trackOfferClick` ghi mot ban ghi click KHONG CO NGUON. Nghia la tien quang cao
 * chay ma khong quy duoc ve chien dich nao. Do 28/08/2026: 56 ban ghi click, chi
 * 5 co nguon.
 *
 * Bit o day thi ca BA nut (Get Deal / Get Code / sang store) deu gan duoc nguon
 * ma KHONG phai sua `trackClick.ts` — no da doc cookie san.
 *
 * ⚠️ TACH RA KHOI `proxy.ts` vi Next 16 chi cho MOT file proxy trong ca du an, va
 * file do da la cong gac dang nhap admin. Tai lieu Next khuyen dung dung cach nay:
 * "Break out proxy functionalities into separate files and import them into your
 * main proxy.ts" (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
 */

/**
 * ⚠️ CHI ghi cookie khi URL mang `?s=` hoac click-id Google Ads. Ly do khong phai
 * tiet kiem: dat cookie tren MOI luot xem se lam moi trang tinh tra ve mot header
 * `Set-Cookie`, va mot ban HTML da cache kem `Set-Cookie` co the phat nham cookie
 * cua nguoi nay cho nguoi khac. Han hep dieu kien lai thi chi luot vao tu quang
 * cao/bai dang moi bi anh huong.
 *
 * ⚠️ KHONG cat `gclid` ra khoi URL. Cat di thi URL gon hon, nhung the theo doi
 * chuyen doi cua chinh Google Ads (gtag doc `gclid` tren trang dich) se hong —
 * doi mot phep do lay mot phep do khac.
 *
 * @returns `null` khi request nay khong mang tin hieu chien dich nao — nguoi goi
 *   cu tiep tuc binh thuong. Tra `null` thay vi `NextResponse.next()` de `proxy.ts`
 *   tu quyet dinh tra ve gi, khong bi ep mot dang phan hoi.
 */
export function attributionResponse(request: NextRequest): NextResponse | null {
  const { searchParams } = request.nextUrl
  const paid = hasGoogleAdsClickId(searchParams)
  const campaign = parseCampaign(searchParams.get('s'))
  if (!paid && !campaign) return null

  const ua = request.headers.get('user-agent')
  if (isLikelyBot(ua)) return null

  // Chep dung luat uu tien cua `/g/[code]/route.ts`: nguon tuoi thang, TRU khi no
  // ra 'direct'/'internal' thi lay lai nguon da luu. Nho vay khach den tu
  // Instagram, di lang quang trong site roi moi bam thi don van duoc ghi cho
  // Instagram thay vi bien thanh "trong site".
  const detected = detectShortLinkSource(
    ua,
    request.headers.get('referer'),
    request.headers.get('host'),
    paid
  )
  const raw = request.cookies.get(ATTRIBUTION_COOKIE)?.value
  const stored = detected === 'direct' || detected === 'internal' ? (raw ? parseAttribution(raw) : null) : null

  const response = NextResponse.next()
  response.cookies.set(
    ATTRIBUTION_COOKIE,
    serializeAttribution({
      source: stored?.source ?? detected,
      campaign: campaign ?? stored?.campaign,
      // Khong co `entryCode`: trang blog/review/store khong gan voi mot ma san
      // pham nao. Chi short link `/d/`, `/g/` moi dien duoc o do.
      entryCode: stored?.entryCode,
    }),
    attributionCookieOptions
  )

  // Chan CDN cache lai chinh ban tra loi mang Set-Cookie nay. Neu khong, mot ban
  // HTML kem cookie chien dich A co the duoc phat cho khach den tu chien dich B
  // — va so lieu se sai theo kieu khong bao gio lo ra o test.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
