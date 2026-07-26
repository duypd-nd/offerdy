import { writeClient } from '@/sanity/writeClient'
import { verifyCronRequest } from '@/lib/cronAuth'
import { checkUrl } from '@/lib/checkOfferLink'

const BATCH_SIZE = Number(process.env.LINK_CHECK_BATCH_SIZE) || 50

// Kiem tra dung URL khach thuc su den: co productUrl thi trang san pham moi la
// dich, va trang san pham chet (het hang, go SKU) thuong xuyen hon trang chu
// shop nhieu. Khong can gan ma ref o day — chi can biet trang con song hay khong.
const CANDIDATES_QUERY = `*[_type == "offer" && active == true && (defined(productUrl) || defined(link)) && coalesce(productUrl, link) != ""] | order(coalesce(linkCheckedAt, "1970-01-01") asc) [0...$limit] {
  "id": _id, "link": coalesce(productUrl, link)
}`

export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'link-check-nightly')
  if (!auth.ok) return auth.response

  const offers = await writeClient.fetch(CANDIDATES_QUERY, { limit: BATCH_SIZE })

  const results = await Promise.all(
    offers.map(async (offer: { id: string; link: string }) => {
      const check = await checkUrl(offer.link)
      try {
        await writeClient.patch(offer.id).set({
          linkStatus: check.ok ? 'ok' : 'broken',
          linkCheckedAt: new Date().toISOString(),
        }).commit()
        return { id: offer.id, ok: check.ok }
      } catch (err) {
        return { id: offer.id, ok: false, error: String(err) }
      }
    })
  )

  return Response.json({ processed: results.length, results })
}
