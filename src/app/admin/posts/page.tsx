import { writeClient } from '@/sanity/writeClient'
import PostAdmin from './PostAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "post"] | order(publishedAt desc, _createdAt desc) {
  _id, title, "slug": slug.current, category, author, publishedAt, excerpt, content, "imageUrl": coalesce(image.asset->url, externalImageUrl), _createdAt, _updatedAt
}`

export default async function AdminPostsPage() {
  const posts = await writeClient.fetch(QUERY)
  return <PostAdmin initialPosts={posts ?? []} />
}
