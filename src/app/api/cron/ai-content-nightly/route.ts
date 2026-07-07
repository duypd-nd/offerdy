import { writeClient } from '@/sanity/writeClient'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { generateOfferContent, type OfferContentInput } from '@/lib/ai/generateOfferContent'

const STORE_BATCH_SIZE = Number(process.env.AI_CONTENT_BATCH_SIZE) || 20
const OFFER_BATCH_SIZE = Number(process.env.AI_CONTENT_OFFER_BATCH_SIZE) || 30

const STORE_CANDIDATES_QUERY = `*[_type == "store" && published != false && !defined(description) && aiReviewStatus == "none"] | order(_createdAt asc) [0...$limit] {
  "id": _id, name, category, website, maxOffer, shortDescription, description
}`

const OFFER_CANDIDATES_QUERY = `*[_type == "offer" && active == true && !defined(description) && aiReviewStatus == "none"] | order(_createdAt asc) [0...$limit] {
  "id": _id, title, offerText, expiresAt,
  "storeName": store->name,
  "hasCouponCode": defined(couponCode)
}`

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [stores, offers] = await Promise.all([
    writeClient.fetch(STORE_CANDIDATES_QUERY, { limit: STORE_BATCH_SIZE }),
    writeClient.fetch(OFFER_CANDIDATES_QUERY, { limit: OFFER_BATCH_SIZE }),
  ])

  const storeResults = await Promise.all(
    stores.map(async (store: { id: string; name: string }) => {
      try {
        await generateStoreContent(store)
        return { id: store.id, ok: true }
      } catch (err) {
        return { id: store.id, ok: false, error: String(err) }
      }
    })
  )

  const offerResults = await Promise.all(
    offers.map(async (offer: OfferContentInput) => {
      try {
        await generateOfferContent(offer)
        return { id: offer.id, ok: true }
      } catch (err) {
        return { id: offer.id, ok: false, error: String(err) }
      }
    })
  )

  return Response.json({
    stores: { processed: storeResults.length, results: storeResults },
    offers: { processed: offerResults.length, results: offerResults },
  })
}
