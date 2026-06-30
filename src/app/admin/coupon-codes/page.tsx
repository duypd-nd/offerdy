import { writeClient } from '@/sanity/writeClient'
import CouponCodesAdmin from './CouponCodesAdmin'

export const dynamic = 'force-dynamic'

const OFFERS_QUERY = `*[_type == "offer" && defined(couponCode) && couponCode != ""] | order(_createdAt desc) {
  _id, title, offerText, couponCode, "link": link, description, expiresAt, active, verified, _createdAt,
  "store": store->{ _id, name, "slug": slug.current }
}`

const STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

export default async function AdminCouponCodesPage() {
  const [offers, stores] = await Promise.all([
    writeClient.fetch(OFFERS_QUERY),
    writeClient.fetch(STORES_QUERY),
  ])
  return <CouponCodesAdmin initialOffers={offers ?? []} stores={stores ?? []} />
}
