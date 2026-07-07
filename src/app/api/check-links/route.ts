import { writeClient } from '@/sanity/writeClient'
import { checkUrl } from '@/lib/checkOfferLink'

type CheckRequest = { offerId: string; url: string }
type CheckResult = { offerId: string; url: string; ok: boolean; status?: number; error?: string }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items } = body as { items: CheckRequest[] }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Thieu items' }, { status: 400 })
    }
    if (items.length > 30) {
      return Response.json({ error: 'Toi da 30 link moi lan goi' }, { status: 400 })
    }

    const results: CheckResult[] = await Promise.all(
      items.map(async ({ offerId, url }) => {
        const check = await checkUrl(url)
        try {
          await writeClient.patch(offerId).set({
            linkStatus: check.ok ? 'ok' : 'broken',
            linkCheckedAt: new Date().toISOString(),
          }).commit()
        } catch { /* van tra ket qua check du luu that bai */ }
        return { offerId, url, ...check }
      })
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
