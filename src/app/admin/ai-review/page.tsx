import { writeClient } from '@/sanity/writeClient'
import AiReviewAdmin from './AiReviewAdmin'

export const dynamic = 'force-dynamic'

const PENDING_STORES_QUERY = `*[_type == "store" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, name, "slug": slug.current, shortDescription, aiDraft
}`

const PENDING_OFFERS_QUERY = `*[_type == "offer" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, title, offerText, "storeName": store->name, "storeSlug": store->slug.current, aiDraft
}`

const PENDING_DEALS_QUERY = `*[_type == "deal" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, title, store, "slug": slug.current, aiDraft
}`

export default async function AiReviewPage() {
  const [stores, offers, deals] = await Promise.all([
    writeClient.fetch(PENDING_STORES_QUERY),
    writeClient.fetch(PENDING_OFFERS_QUERY),
    writeClient.fetch(PENDING_DEALS_QUERY),
  ])
  return <AiReviewAdmin initialStores={stores ?? []} initialOffers={offers ?? []} initialDeals={deals ?? []} />
}
