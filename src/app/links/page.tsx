import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllDeals, getSiteSettings, getCouponOffers } from '@/sanity/queries'
import LinkInBioDeals from '@/components/LinkInBioDeals'
import LinkInBioCodes from '@/components/LinkInBioCodes'
import { rankDealsForLinks } from '@/lib/dealRanking'
import type { Deal } from '@/data/deals'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Offerdy — Today’s Best Deals',
  description: 'Hand-picked deals, verified before they go live. Tap any deal to see full details.',
  // Trang tien ich cho traffic mang xa hoi, noi dung trung voi /deals. Cho index
  // se tao trang thu hai canh tranh chinh /deals tren Google. Van de follow de
  // link equity chay tiep vao cac trang deal.
  robots: { index: false, follow: true },
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
  // src/lib/dealRanking.ts — 12 o dau cua trang nay la vi tri dat nhat cua site.
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
          <div className="lb-name">Offer<span>dy</span></div>
          <div className="lb-tag">{settings.tagline}</div>
        </div>

        <div className="lb-chips">
          <Link href="/deals" className="lb-chip">All deals</Link>
          <Link href="/coupon-codes" className="lb-chip">Coupon codes</Link>
          <Link href="/flash-sales" className="lb-chip">Flash sales</Link>
          <Link href="/stores" className="lb-chip">Stores</Link>
        </div>

        {deals.length > 0 && <LinkInBioDeals deals={deals} />}

        {/* Ma coupon dat NGAY sau luoi deal: day la tai san manh nhat cho
            Instagram/TikTok (ma la CHU, dan vao caption duoc; con GoAffPro ghi nhan
            don qua ca ma nen khach khong bam link van tinh). Truoc day no nam sau
            mot chip dan sang /coupon-codes. */}
        <LinkInBioCodes offers={couponOffers} />

        <Link href="/deals" className="lb-all">View all deals →</Link>

        <div className="lb-foot">
          {/* Cong bo affiliate la yeu cau phap ly (FTC), khong phai tuy chon.
              Co y KHONG dung globalConfig.articleDisclaimer o day: chuoi do chua
              the <a> (phai dangerouslySetInnerHTML) va dai 3 cau — qua nang cho
              footer tren dien thoai. Cau ngan + link toi trang cong bo day du la
              mau chuan va van dat yeu cau "clear and conspicuous". */}
          Offerdy may earn a commission from links on this page.
          <br />
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
          {' · '}
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </div>
  )
}
