import { after, NextResponse } from 'next/server'
import { getDealRefByCode, getDealPreviewByCode, getSiteName, getSiteBase } from '@/sanity/queries'
import { parseDealCode } from '@/lib/dealCode'
import { dealPreviewHtml } from '@/lib/dealPreviewHtml'
import { detectShortLinkSource, isLikelyBot, isLinkPreviewBot, parseCampaign } from '@/lib/shortLinkSource'
import { trackShortLinkClick } from '@/lib/trackShortLink'
import { ATTRIBUTION_COOKIE, attributionCookieOptions, serializeAttribution } from '@/lib/attribution'

// Short link theo ma san pham: offerdy.com/d/1000 -> /deals/<slug>.
//
// Muc dich: caption Instagram/TikTok khong cho bam link, nhung mot chuoi ngan de
// nho thi khach tu go duoc — 0 lan cham thay vi phai vao /links roi tim. Dung
// chung ma voi o tim kiem tren /links, nen mot con so trong bai dang phuc vu ca
// hai duong vao.
//
// Route handler (khong phai page) vi ket qua luon la redirect — khong co gi de
// render, va tranh tao them mot trang trung noi dung voi /deals/<slug>.
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const parsed = parseDealCode(decodeURIComponent(code))
  const deal = parsed === null ? null : await getDealRefByCode(parsed)

  // Ma sai / deal da xoa: ve /links thay vi 404. Khach den tu bai dang mang xa hoi
  // va go sai mot so — dua ho vao dung trang co o tim kiem va toan bo deal thi con
  // co co hoi giu lai, 404 la mat hang. Co y KHONG truyen ma qua ?query: /links
  // doc searchParams se thanh dynamic rendering moi luot xem, mat cache 60s.
  const target = deal ? `/deals/${deal.slug}` : '/links'

  // 302 chu khong phai 301: slug deal doi khi title duoc sua, ma 301 bi trinh
  // duyet/CDN cache vinh vien se ghim short link vao mot slug da chet. Rieng voi
  // tracking con mot ly do nua: 301 duoc cache thi luot sau khong con di qua route
  // nay, va so click ngung tang du nguoi van bam.
  const response = NextResponse.redirect(new URL(target, request.url), 302)

  const ua = request.headers.get('user-agent')

  // Bot doc link preview: tra the OG ngay thay vi bat no di them mot vong
  // redirect. /d/ von da hoat dong (bot cua Facebook co di theo 302 ve trang deal
  // that), nhung khong phai client nhan tin nao cung di theo — tra thang thi the
  // preview chac chan hien. Crawler tim kiem (Googlebot...) KHONG di vao nhanh
  // nay: voi ho redirect tot hon, no gop tin hieu ve trang deal that.
  if (deal && parsed !== null && isLinkPreviewBot(ua)) {
    const preview = await getDealPreviewByCode(parsed)
    if (preview) {
      return new Response(dealPreviewHtml(preview, { target, siteName: await getSiteName(), base: await getSiteBase() }), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  if (!deal || parsed === null) return response
  // Trinh thu thap/doc link preview khong phai nguoi — khong dem, cung khong gan
  // nguon (cookie cho bot la vo nghia).
  if (isLikelyBot(ua)) return response

  const source = detectShortLinkSource(ua, request.headers.get('referer'), request.headers.get('host'))
  const campaign = parseCampaign(new URL(request.url).searchParams.get('s'))

  // Gan nguon cho ca phien: click "Get Deal" o request sau se doc cookie nay, nho
  // do moi biet Instagram/TikTok cho bao nhieu luot BAM SANG MERCHANT chu khong
  // chi bao nhieu luot xem. Xem src/lib/attribution.ts.
  response.cookies.set(
    ATTRIBUTION_COOKIE,
    serializeAttribution({ source, campaign, entryCode: parsed }),
    attributionCookieOptions
  )

  // Tracking chay SAU khi response da gui (after()), nen no khong cong them do tre
  // vao redirect — 2 luot ghi Sanity ~200-400ms la thay ro tren 4G. Fire-and-forget
  // thuong khong dung o serverless: runtime co the ket thuc ngay sau response va
  // giet promise chua xong; after() la co che chinh chu de giu no song.
  after(() => trackShortLinkClick({ dealId: deal.id, code: parsed, source, campaign }))

  return response
}
