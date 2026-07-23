import { ImageResponse } from 'next/og'
import { getDealBySlug } from '@/sanity/queries'
import { DealOgImage, BrandedOgImage } from '@/lib/ogTemplate'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Thẻ preview khi dán link deal lên Facebook/X/Zalo. Truoc day trang deal chi dua
// anh san pham tho tu Sanity lam og:image — ti le tuy y nen bi cat lech trong khung
// 1.91:1, va quan trong hon la GIA + % GIAM khong xuat hien trong preview, tuc mat
// dung thu keo nguoi ta bam vao.
//
// Luu y: de file nay co hieu luc thi generateMetadata cua page.tsx KHONG duoc set
// openGraph.images. Next.js noi file-based metadata uu tien hon, nhung thuc te da
// kiem chung tren chinh production cua du an: khi generateMetadata set images tuong
// minh thi gia tri do thang, va route opengraph-image bi bo qua hoan toan.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const deal = await getDealBySlug(slug)

  // Deal khong ton tai (slug sai / vua bi xoa) — van tra ve anh thuong hieu hop le
  // thay vi de crash, vi bot cua mang xa hoi se fetch URL nay bat ke trang con song.
  if (!deal) {
    return new ImageResponse(
      <BrandedOgImage title="Offerdy" subtitle="Verified deals, tested before publishing" />,
      { ...size }
    )
  }

  const badge = dealDiscountBadge(deal)

  return new ImageResponse(
    (
      <DealOgImage
        title={deal.title}
        store={deal.store}
        priceSale={deal.priceSale}
        priceOrig={deal.priceOrig}
        badgeMain={badge.main}
        badgeSub={badge.sub}
        imageUrl={deal.imageUrl}
      />
    ),
    { ...size }
  )
}
