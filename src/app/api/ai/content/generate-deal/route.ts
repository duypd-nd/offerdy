import { writeClient } from '@/sanity/writeClient'
import { generateDealContent, type DealContentInput } from '@/lib/ai/generateDealContent'

const DEAL_QUERY = `*[_type == "deal" && _id in $ids] {
  "id": _id, title, store, priceSale, priceOrig, discount
}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dealIds } = body as { dealIds: string[] }

    if (!Array.isArray(dealIds) || dealIds.length === 0) {
      return Response.json({ error: 'dealIds is required' }, { status: 400 })
    }

    const deals = await writeClient.fetch(DEAL_QUERY, { ids: dealIds })

    const results = await Promise.all(
      deals.map(async (deal: DealContentInput) => {
        try {
          await generateDealContent(deal)
          return { id: deal.id, ok: true }
        } catch (err) {
          return { id: deal.id, ok: false, error: String(err) }
        }
      })
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
