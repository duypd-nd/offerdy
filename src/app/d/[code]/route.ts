import { after } from 'next/server'
import { getDealRefByCode } from '@/sanity/queries'
import { parseDealCode } from '@/lib/dealCode'
import { detectShortLinkSource, isLikelyBot, parseCampaign } from '@/lib/shortLinkSource'
import { trackShortLinkClick } from '@/lib/trackShortLink'

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

  // Tracking chay SAU khi response da gui (after()), nen no khong cong them do tre
  // vao redirect — 2 luot ghi Sanity ~200-400ms la thay ro tren 4G. Fire-and-forget
  // thuong khong dung o serverless: runtime co the ket thuc ngay sau response va
  // giet promise chua xong; after() la co che chinh chu de giu no song.
  if (deal && parsed !== null) {
    const ua = request.headers.get('user-agent')
    if (!isLikelyBot(ua)) {
      const source = detectShortLinkSource(ua, request.headers.get('referer'))
      const campaign = parseCampaign(new URL(request.url).searchParams.get('s'))
      after(() => trackShortLinkClick({ dealId: deal.id, code: parsed, source, campaign }))
    }
  }

  // 302 chu khong phai 301: slug deal doi khi title duoc sua, ma 301 bi trinh
  // duyet/CDN cache vinh vien se ghim short link vao mot slug da chet. Rieng voi
  // tracking con mot ly do nua: 301 duoc cache thi luot sau khong con di qua route
  // nay, va so click ngung tang du nguoi van bam.
  return Response.redirect(new URL(target, request.url), 302)
}
