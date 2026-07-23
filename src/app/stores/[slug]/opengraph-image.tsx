import { ImageResponse } from 'next/og'
import { getStoreBySlug, getStoreTopCoupon } from '@/sanity/queries'
import { BrandedOgImage } from '@/lib/ogTemplate'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CATEGORY_LABELS: Record<string, string> = {
  electronics: 'Electronics', fashion: 'Fashion', beauty: 'Beauty',
  home: 'Home & Garden', sports: 'Sports', food: 'Food & Health',
  travel: 'Travel', books: 'Books', gaming: 'Gaming', general: 'General',
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [store, coupon] = await Promise.all([
    getStoreBySlug(slug),
    getStoreTopCoupon(slug),
  ])

  // Khi co ma coupon: eyebrow bao "Exclusive Code" va subtitle uu tien noi dung
  // uu dai (offerText) de the OG noi bat mA + muc giam. Khong co ma -> giu nguyen.
  const subtitle = coupon?.offerText
    ? truncateOffer(coupon.offerText)
    : store?.maxOffer
      ? `Up to ${store.maxOffer}% off — verified daily`
      : 'Verified deals, tested before publishing'

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={coupon
          ? 'Exclusive Code'
          : store?.category ? CATEGORY_LABELS[store.category] ?? store.category : 'Coupons & Deals'}
        title={store ? `${store.name} Coupons & Deals` : 'Offerdy'}
        subtitle={subtitle}
        logoUrl={store?.imageUrl}
        initials={store?.abbr}
        couponCode={coupon?.code}
      />
    ),
    { ...size }
  )
}

// offerText kieu "25% Off On Your Order at Consistent" — cat phan "at <store>"
// dai dong o duoi cho gon trong the OG.
function truncateOffer(text: string): string {
  return text.replace(/\s+at\s+.*$/i, '').trim() || text
}
