import { writeClient } from '@/sanity/writeClient'
import ReviewAdmin from './ReviewAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "review"] | order(publishedAt desc, _createdAt desc) {
  _id, title, "slug": slug.current, tag, author, publishedAt, excerpt, content, "imageUrl": coalesce(image.asset->url, externalImageUrl), _createdAt
}`

export default async function AdminReviewsPage() {
  const reviews = await writeClient.fetch(QUERY)
  return <ReviewAdmin initialReviews={reviews ?? []} />
}
