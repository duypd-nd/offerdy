import { ImageResponse } from 'next/og'
import { getSiteName, getPostBySlug } from '@/sanity/queries'
import { BrandedOgImage } from '@/lib/ogTemplate'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, siteName] = await Promise.all([getPostBySlug(slug), getSiteName()])

  return new ImageResponse(
    (
      <BrandedOgImage
        eyebrow={post?.category ? `${siteName} Blog · ${post.category}` : `${siteName} Blog`}
        title={post?.title ?? `${siteName} Blog`}
        subtitle={post?.excerpt}
        initials={post?.coverEmoji}
      />
    ),
    { ...size }
  )
}
