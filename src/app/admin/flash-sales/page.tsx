import { writeClient } from '@/sanity/writeClient'
import FlashSalesAdmin from './FlashSalesAdmin'

export const dynamic = 'force-dynamic'

const OFFERS_QUERY = `*[_type == "offer" && defined(expiresAt)] | order(expiresAt asc) {
  _id, title, offerText, couponCode, "link": link, expiresAt, active, verified, _createdAt,
  "store": store->{ _id, name, "slug": slug.current }
}`

const STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

export default async function AdminFlashSalesPage() {
  const [offers, stores] = await Promise.all([
    writeClient.fetch(OFFERS_QUERY),
    writeClient.fetch(STORES_QUERY),
  ])
  return <FlashSalesAdmin initialOffers={offers ?? []} stores={stores ?? []} />
}
