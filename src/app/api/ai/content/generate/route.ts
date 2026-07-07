import { writeClient } from '@/sanity/writeClient'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'

const STORE_QUERY = `*[_type == "store" && _id in $ids] {
  "id": _id, name, category, website, maxOffer, shortDescription, description
}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { storeIds } = body as { storeIds: string[] }

    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return Response.json({ error: 'storeIds is required' }, { status: 400 })
    }

    const stores = await writeClient.fetch(STORE_QUERY, { ids: storeIds })

    const results = await Promise.all(
      stores.map(async (store: { id: string; name: string }) => {
        try {
          await generateStoreContent(store)
          return { id: store.id, ok: true }
        } catch (err) {
          return { id: store.id, ok: false, error: String(err) }
        }
      })
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
