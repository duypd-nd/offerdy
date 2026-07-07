import { ImageResponse } from 'next/og'
import { getReviewBySlug } from '@/sanity/queries'
import { BrandedOgImage } from '@/lib/ogTemplate'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const review = await getReviewBySlug(slug)
  const stars = review?.stars ? Math.round(review.stars * 10) / 10 : undefined

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={review?.tag && review.tag.toLowerCase() !== 'review' ? `Offerdy Review · ${review.tag}` : 'Offerdy Review'}
        title={review?.title ?? 'Offerdy Review'}
        subtitle={stars ? `${'★'.repeat(Math.round(stars))} ${stars}/5${review?.excerpt ? ' — ' + review.excerpt : ''}` : review?.excerpt}
        initials={review?.emoji}
      />
    ),
    { ...size }
  )
}
