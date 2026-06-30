import { writeClient } from '@/sanity/writeClient'
import TipsGuidesAdmin from './TipsGuidesAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "post" && category == "Tips & Guides"] | order(publishedAt desc, _createdAt desc) {
  _id, title, "slug": slug.current, author, publishedAt, excerpt, content, _createdAt, _updatedAt
}`

export default async function AdminTipsGuidesPage() {
  const posts = await writeClient.fetch(QUERY)
  return <TipsGuidesAdmin initialPosts={posts ?? []} />
}
