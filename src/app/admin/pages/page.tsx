import { writeClient } from '@/sanity/writeClient'
import PageAdmin from './PageAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "page"] | order(_createdAt desc) {
  _id, title, "slug": slug.current, excerpt, content,
  "imageUrl": image.asset->url, published, _createdAt, _updatedAt
}`

export default async function AdminPagesPage() {
  const pages = await writeClient.fetch(QUERY)
  return <PageAdmin initialPages={pages ?? []} />
}
