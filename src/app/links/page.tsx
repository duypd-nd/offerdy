import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAllDeals, getSiteSettings } from '@/sanity/queries'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import type { Deal } from '@/data/deals'

export const revalidate = 60

// So deal hien tren trang. Link-in-bio la de luot nhanh tren dien thoai, khong
// phai trang danh muc — nhieu qua thi loang, nut "View all deals" o cuoi lo phan
// con lai.
const MAX_DEALS = 12

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

  const deals = (allDeals as Deal[]).slice(0, MAX_DEALS)

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

        {deals.length > 0 && (
          <>
            <div className="lb-sec">
              <span className="lb-sec-t">Latest deals</span>
              <span className="lb-sec-line" />
            </div>

            <div className="lb-list">
              {deals.map((deal, i) => {
                const badge = dealDiscountBadge(deal)
                return (
                  <Link key={deal.id} href={`/deals/${deal.slug}`} className="lb-card">
                    <div className="lb-thumb">
                      {deal.imageUrl && (
                        <Image
                          src={deal.imageUrl}
                          alt={deal.title}
                          fill
                          sizes="86px"
                          style={{ objectFit: 'cover' }}
                          // Anh dau tien la LCP cua trang (hero chi co chu).
                          // Trang nay nhan traffic tu bio Instagram/TikTok — gan nhu
                          // 100% la 4G tren dien thoai, nen uu tien tai no truoc.
                          priority={i === 0}
                        />
                      )}
                      <span className="lb-badge">
                        {badge.main}{badge.sub && <i>{badge.sub}</i>}
                      </span>
                    </div>

                    <div className="lb-body">
                      <div className="lb-title">{deal.title}</div>
                      <div className="lb-price">
                        <span className="lb-now">{deal.priceSale}</span>
                        {deal.priceOrig && <span className="lb-was">{deal.priceOrig}</span>}
                      </div>
                    </div>

                    <span className="lb-go" aria-hidden="true">›</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

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
