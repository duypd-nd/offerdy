import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/sanity/queries'
import { BrandedOgImage } from '@/lib/ogTemplate'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={post?.category ? `Offerdy Blog · ${post.category}` : 'Offerdy Blog'}
        title={post?.title ?? 'Offerdy Blog'}
        subtitle={post?.excerpt}
        initials={post?.coverEmoji}
      />
    ),
    { ...size }
  )
}
