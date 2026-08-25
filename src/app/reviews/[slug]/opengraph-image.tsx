import { ImageResponse } from 'next/og'
import { getSiteName, getReviewBySlug } from '@/sanity/queries'
import { BrandedOgImage } from '@/lib/ogTemplate'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [review, siteName] = await Promise.all([getReviewBySlug(slug), getSiteName()])
  const stars = review?.stars ? Math.round(review.stars * 10) / 10 : undefined

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={review?.tag && review.tag.toLowerCase() !== 'review' ? `${siteName} Review · ${review.tag}` : `${siteName} Review`}
        title={review?.title ?? `${siteName} Review`}
        subtitle={stars ? `${'★'.repeat(Math.round(stars))} ${stars}/5${review?.excerpt ? ' — ' + review.excerpt : ''}` : review?.excerpt}
        initials={review?.emoji}
      />
    ),
    { ...size }
  )
}
