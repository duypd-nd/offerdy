import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllDeals, getSiteName, getSiteSettings, getCouponOffers } from '@/sanity/queries'
import LinkInBioDeals from '@/components/LinkInBioDeals'
import LinkInBioCodes from '@/components/LinkInBioCodes'
import { rankDealsForLinks } from '@/lib/dealRanking'
import type { Deal } from '@/data/deals'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const siteName = await getSiteName()
  return {
    // absolute: bo qua titleTemplate cua layout. Tieu de nay da mo dau bang ten
    // thuong hieu, de template noi them "| <ten> - Real Deals. Verified" nua thi
    // tren tab trinh duyet hien "<ten> ... | <ten> ..." — day la trang dich cua
    // toan bo traffic Instagram/TikTok nen cai nhin dau tien phai sach.
    title: { absolute: `${siteName} — Today’s Best Deals` },
    description: 'Hand-picked deals, verified before they go live. Tap any deal to see full details.',
    // Trang tien ich cho traffic mang xa hoi, noi dung trung voi /deals. Cho index
    // se tao trang thu hai canh tranh chinh /deals tren Google. Van de follow de
    // link equity chay tiep vao cac trang deal.
    robots: { index: false, follow: true },
  }
}

export default async function LinksPage() {
  const [allDeals, settings, couponOffers] = await Promise.all([
    getAllDeals(),
    getSiteSettings(),
    // Ma coupon that cua cac shop. Giu NGUYEN thu tu do nguoi van hanh dat
    // (`order` trong COUPON_OFFERS_QUERY) chu khong xep theo so click: voi tong
    // luong click hien tai, xep theo hieu qua la xep theo nhieu.
    getCouponOffers(),
  ])

  // Ca danh sach di xuong client (khong slice o day) de o tim kiem loc duoc TOAN BO
  // deal ma khong phai goi API — xem LinkInBioDeals.
  //
  // Ghim truoc, roi den hieu qua that (xem -> bam sang merchant). Xem
  // src/lib/dealRanking.ts — 50 o dau cua trang nay la vi tri dat nhat cua site.
  const deals = rankDealsForLinks(allDeals as Deal[])

  return (
    <div className="lb-page">
      <div className="lb-wrap">
        <div className="lb-hero">
          {/* CO Y dung wordmark bang CHU chu khong dung anh logo tu Sanity.
              Logo do la chu mau toi tren nen trong (1536x396), thiet ke cho nen sang —
              dat len nen toi cua trang nay thi phan giua gan nhu tang hinh, doc ra
              "O...dy". Wordmark chu luon doc duoc, va giong het thanh phan trong anh
              OG (src/lib/ogTemplate.tsx) nen bai dang va trang dich dong bo. */}
          {/* La <h1> chu khong phai <div>: day la trang dich cua toan bo traffic
              Instagram/TikTok ma truoc do khong co tieu de cap mot nao — trinh doc
              man hinh nhay vao khong biet dang o dau. Kieu dang khong doi, class
              giu nguyen toan bo. */}
          <h1 className="lb-name">Offer<span>dy</span></h1>
          <div className="lb-tag">{settings.tagline}</div>
        </div>

        <div className="lb-chips">
          <Link href="/deals" className="lb-chip">All deals</Link>
          <Link href="/coupon-codes" className="lb-chip">Coupon codes</Link>
          <Link href="/flash-sales" className="lb-chip">Flash sales</Link>
          <Link href="/stores" className="lb-chip">Stores</Link>
        </div>

        {/* Ma coupon truyen VAO LinkInBioDeals de nam giua o tim kiem va luoi deal.
            Ban dau dat sau <LinkInBioDeals/>, tuc sau 12 the deal (~4000px cuon) —
            chon mat tai san manh nhat cho Instagram/TikTok o dung trang ma traffic
            hai nen tang do do ve. */}
        {deals.length > 0
          ? <LinkInBioDeals deals={deals} beforeList={<LinkInBioCodes offers={couponOffers} />} />
          : <LinkInBioCodes offers={couponOffers} />}

        <Link href="/deals" className="lb-all">View all deals →</Link>

        <div className="lb-foot">
          {/* Cong bo affiliate la yeu cau phap ly (FTC), khong phai tuy chon.
              Co y KHONG dung globalConfig.articleDisclaimer o day: chuoi do chua
              the <a> (phai dangerouslySetInnerHTML) va dai 3 cau — qua nang cho
              footer tren dien thoai. Cau ngan + link toi trang cong bo day du la
              mau chuan va van dat yeu cau "clear and conspicuous". */}
          {settings.siteName} may earn a commission from links on this page.
          <br />
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
          {' · '}
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </div>
  )
}
