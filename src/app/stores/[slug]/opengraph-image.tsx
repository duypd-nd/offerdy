import { ImageResponse } from 'next/og'
import { getStoreBySlug } from '@/sanity/queries'
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
  const store = await getStoreBySlug(slug)

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={store?.category ? CATEGORY_LABELS[store.category] ?? store.category : 'Coupons & Deals'}
        title={store ? `${store.name} Coupons & Deals` : 'Offerdy'}
        subtitle={store?.maxOffer ? `Up to ${store.maxOffer}% off — verified daily` : 'Verified deals, tested before publishing'}
        logoUrl={store?.imageUrl}
        initials={store?.abbr}
      />
    ),
    { ...size }
  )
}
