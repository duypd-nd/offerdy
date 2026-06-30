import { writeClient } from '@/sanity/writeClient'
import ComparisonsAdmin from './ComparisonsAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "post" && category == "Comparison"] | order(publishedAt desc, _createdAt desc) {
  _id, title, "slug": slug.current, author, publishedAt, excerpt, content, _createdAt, _updatedAt
}`

export default async function AdminComparisonsPage() {
  const posts = await writeClient.fetch(QUERY)
  return <ComparisonsAdmin initialPosts={posts ?? []} />
}
