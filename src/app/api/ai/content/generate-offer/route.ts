import { writeClient } from '@/sanity/writeClient'
import { generateOfferContent, type OfferContentInput } from '@/lib/ai/generateOfferContent'

const OFFER_QUERY = `*[_type == "offer" && _id in $ids] {
  "id": _id, title, offerText, expiresAt,
  "storeName": store->name,
  "hasCouponCode": defined(couponCode)
}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { offerIds } = body as { offerIds: string[] }

    if (!Array.isArray(offerIds) || offerIds.length === 0) {
      return Response.json({ error: 'offerIds is required' }, { status: 400 })
    }

    const offers = await writeClient.fetch(OFFER_QUERY, { ids: offerIds })

    const results = await Promise.all(
      offers.map(async (offer: OfferContentInput) => {
        try {
          await generateOfferContent(offer)
          return { id: offer.id, ok: true }
        } catch (err) {
          return { id: offer.id, ok: false, error: String(err) }
        }
      })
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
