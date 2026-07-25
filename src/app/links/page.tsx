import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllDeals, getSiteSettings } from '@/sanity/queries'
import LinkInBioDeals from '@/components/LinkInBioDeals'
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
  const [allDeals, settings] = await Promise.all([
    getAllDeals(),
    getSiteSettings(),
  ])

  // Ca danh sach di xuong client (khong slice o day) de o tim kiem loc duoc TOAN BO
  // deal ma khong phai goi API — xem LinkInBioDeals.
  //
  // Deal ghim (`pinnedAt`) len dau, ghim sau nam tren ghim truoc; phan con lai giu
  // thu tu moi-nhat-truoc tu ALL_DEALS_QUERY. Ly do can ghim: bio Instagram/TikTok
  // tro co dinh vao day, nen san pham cua bai dang HOM NAY phai o tren cung — chu
  // khong phai deal moi nhap vao Sanity gan nhat. Sort o day chu khong sort trong
  // GROQ vi /deals dung chung query do va co y khong bi ghim.
  const deals = [...(allDeals as Deal[])].sort((a, b) => {
    if (a.pinnedAt && b.pinnedAt) return b.pinnedAt.localeCompare(a.pinnedAt)
    if (a.pinnedAt) return -1
    if (b.pinnedAt) return 1
    return 0   // giu nguyen thu tu goc (Array.prototype.sort on dinh)
  })

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
