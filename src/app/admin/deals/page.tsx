import { writeClient } from '@/sanity/writeClient'
import DealAdmin from './DealAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "deal"] | order(coalesce(order, 9999) asc, _createdAt desc) {
  _id, title, "slug": slug.current,
  priceSale, priceOrig, discount, verified, isExpiring, expiresAt, dealUrl,
  "imageUrl": image.asset->url, _createdAt, _updatedAt, "order": coalesce(order, 9999)
}`

export default async function AdminDealsPage() {
  const deals = await writeClient.fetch(QUERY)
  return <DealAdmin initialDeals={deals ?? []} />
}
