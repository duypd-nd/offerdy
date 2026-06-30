import { writeClient } from '@/sanity/writeClient'
import CategoryAdmin from './CategoryAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "category"] | order(order asc, name asc) {
  _id, name, "slug": slug.current, emoji, dealCount, colorClass, order, _createdAt
}`

export default async function AdminCategoriesPage() {
  const categories = await writeClient.fetch(QUERY)
  return <CategoryAdmin initialCategories={categories ?? []} />
}
