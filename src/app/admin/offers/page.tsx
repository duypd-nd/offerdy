import { writeClient } from '@/sanity/writeClient'
import OfferAdmin from './OfferAdmin'

export const dynamic = 'force-dynamic'

const ADMIN_OFFERS_QUERY = `*[_type == "offer"] | order(order desc, _createdAt desc) {
  _id, title, active, "verified": coalesce(verified, true), "order": coalesce(order, 0),
  couponCode, link, offerText, description, expiresAt, _createdAt,
  "store": store->{ _id, name, "slug": slug.current }
}`

const ADMIN_STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

export default async function AdminOffersPage() {
  const [offers, stores] = await Promise.all([
    writeClient.fetch(ADMIN_OFFERS_QUERY),
    writeClient.fetch(ADMIN_STORES_QUERY),
  ])

  return <OfferAdmin initialOffers={offers ?? []} stores={stores ?? []} />
}
