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
        // Khong ket luan duoc thi CHI cap nhat moc thoi gian, giu nguyen verdict cu.
        // Ghi de bang 'broken' se bien "shop tra loi cham" thanh "link chet" — xem
        // giai thich day du trong src/lib/checkOfferLink.ts. Van bump linkCheckedAt
        // de hang doi (order theo linkCheckedAt asc) di tiep, khong ket o mot shop.
        const patch: Record<string, string> = { linkCheckedAt: new Date().toISOString() }
        if (!check.indeterminate) patch.linkStatus = check.ok ? 'ok' : 'broken'
        await writeClient.patch(offer.id).set(patch).commit()
        return { id: offer.id, ok: check.ok, indeterminate: check.indeterminate ?? false }
      } catch (err) {
        return { id: offer.id, ok: false, error: String(err) }
      }
    })
  )

  return Response.json({ processed: results.length, results })
}
