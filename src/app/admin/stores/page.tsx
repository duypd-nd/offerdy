import { writeClient } from '@/sanity/writeClient'
import StoreAdmin from './StoreAdmin'

export const dynamic = 'force-dynamic'

const ADMIN_STORES_QUERY = `*[_type == "store"] | order(_createdAt desc) {
  _id, name, "slug": slug.current, published, category,
  website, affiliateLink, maxOffer, abbr, shortDescription, description,
  "imageUrl": image.asset->url, _createdAt
}`

const CATEGORIES_QUERY = `*[_type == "category"] | order(order asc) {
  "value": slug.current, "label": name, emoji
}`

export default async function AdminStoresPage() {
  const [stores, categories] = await Promise.all([
    writeClient.fetch(ADMIN_STORES_QUERY),
    writeClient.fetch(CATEGORIES_QUERY).catch(() => []),
  ])
  return <StoreAdmin initialStores={stores ?? []} categories={categories ?? []} />
}
