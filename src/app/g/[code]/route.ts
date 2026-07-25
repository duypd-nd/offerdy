import { after, NextResponse } from 'next/server'
import { getDealRefByCode } from '@/sanity/queries'
import { parseDealCode } from '@/lib/dealCode'
import { detectShortLinkSource, isLikelyBot, parseCampaign } from '@/lib/shortLinkSource'
import { trackDealMerchantClick } from '@/lib/trackShortLink'
import {
  ATTRIBUTION_COOKIE, attributionCookieOptions, readAttribution, serializeAttribution,
} from '@/lib/attribution'

/**
 * Short link DI THANG RA MERCHANT: offerdy.com/g/1000 -> deal.dealUrl.
 *
 * Khac /d/<ma> (vao trang san pham cua minh) o dung mot diem, nhung la diem quyet
 * dinh doanh thu: /d/ bat khach bam CTA mot lan nua moi ra merchant, va moi buoc
 * trung gian la mot cho de mat nguoi. /g/ dung khi bai dang da noi du thong tin
 * (anh, gia, giam bao nhieu) va chi con thieu cu bam mua.
 *
 * Van giu ca hai: /d/ tot hon khi can trang san pham lam viec thuyet phuc (summary,
 * pros/cons, FAQ, review lien quan) hoac khi muon do quan tam truoc khi day ra
 * ngoai. Chon theo bai dang, khong phai chon mot lan cho ca site.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const parsed = parseDealCode(decodeURIComponent(code))
  const deal = parsed === null ? null : await getDealRefByCode(parsed)

  // Khong co dealUrl thi ve trang deal — o do con nut CTA va noi dung. Ma sai thi
  // ve /links (giong /d/): khach go lech mot so van giu duoc.
  const target = deal
    ? (deal.dealUrl ?? `/deals/${deal.slug}`)
    : '/links'

  const response = NextResponse.redirect(
    // dealUrl la URL tuyet doi ra ngoai; new URL(...) van xu ly dung ca hai dang.
    new URL(target, request.url),
    302
  )
  // Redirect phia server khong mang duoc rel="sponsored" nhu the <a> trong
  // AffiliateLink.tsx, ma 302 thi van truyen tin hieu — nen chan crawler bang
  // header (va bang Disallow /g/ trong robots.ts) de day khong thanh mot duong
  // affiliate khong kiem soat duoc ve mat SEO.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')

  if (!deal || parsed === null) return response

  const ua = request.headers.get('user-agent')
  if (isLikelyBot(ua)) return response

  // Uu tien nhan dien tuoi tu request nay. Neu no ra 'direct'/'internal' (khach
  // bam mot link /g/ nam tren chinh site minh, hoac go tay) thi lay lai nguon da
  // luu tu luot vao dau tien — nho vay don van duoc ghi cho Instagram/TikTok thay
  // vi bien thanh "trong site".
  const detected = detectShortLinkSource(ua, request.headers.get('referer'), request.headers.get('host'))
  const stored = detected === 'direct' || detected === 'internal' ? await readAttribution() : null
  const source = stored?.source ?? detected
  const campaign = parseCampaign(new URL(request.url).searchParams.get('s')) ?? stored?.campaign

  response.cookies.set(
    ATTRIBUTION_COOKIE,
    serializeAttribution({ source, campaign, entryCode: parsed }),
    attributionCookieOptions
  )

  // after(): khong bat khach cho 2 luot ghi Sanity truoc khi sang merchant —
  // do tre o day truc tiep lam mat don hang. Xem them /d/[code]/route.ts.
  after(() => trackDealMerchantClick({ dealId: deal.id, code: parsed, source, campaign }))

  return response
}
