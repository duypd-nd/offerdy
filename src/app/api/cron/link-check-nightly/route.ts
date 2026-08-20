import { writeClient } from '@/sanity/writeClient'
import { verifyCronRequest } from '@/lib/cronAuth'
import { checkUrl, landedOnRoot } from '@/lib/checkOfferLink'

const BATCH_SIZE = Number(process.env.LINK_CHECK_BATCH_SIZE) || 50

// Kiem tra dung URL khach thuc su den: co productUrl thi trang san pham moi la
// dich, va trang san pham chet (het hang, go SKU) thuong xuyen hon trang chu
// shop nhieu. Khong can gan ma ref o day — chi can biet trang con song hay khong.
//
// `|| linkStatus == "broken"` cho phep nhan 'broken' TU LANH lai. Truoc day dieu
// kien chi la `active == true`, nen mot offer vua bi tat vua bi danh dau hong thi
// khong bao gio duoc kiem lai — nhan dong bang vinh vien. Do 2026-08-04: trong 6
// offer mang nhan 'broken', ca 6 deu inactive, va **1 trong so do (Dowinx EU) that
// ra tra 200** — nhan sai tu 02/08 khong co duong nao tu sua.
//
// Vi sao dieu do nguy hiem chu khong chi la so lieu ban: `resolveOfferUrl` tat
// deep-link khi thay `linkStatus === 'broken'`. Ngay nguoi van hanh bat lai offer,
// no im lang mat deep-link vi mot ket qua kiem tra da cu hai ngay. Chi phi de
// tranh: vai luot fetch moi dem, va tap nay nho dan vi moi lan kiem dung deu go
// offer do ra khoi dieu kien.
// `isProduct` phan biet "dang kiem trang san pham" voi "dang kiem link shop".
// Bat buoc phai co: luat chet-mem (bi day ve trang goc) chi dung cho trang san
// pham. Mot link shop tro ve trang goc la BINH THUONG — ap luat do cho no la
// gan nhan hong cho gan nhu moi shop.
const CANDIDATES_QUERY = `*[_type == "offer" && (active == true || linkStatus == "broken") && (defined(productUrl) || defined(link)) && coalesce(productUrl, link) != ""] | order(coalesce(linkCheckedAt, "1970-01-01") asc) [0...$limit] {
  "id": _id, "link": coalesce(productUrl, link),
  "isProduct": defined(productUrl) && productUrl != ""
}`

export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'link-check-nightly')
  if (!auth.ok) return auth.response

  const offers = await writeClient.fetch(CANDIDATES_QUERY, { limit: BATCH_SIZE })

  const results = await Promise.all(
    offers.map(async (offer: { id: string; link: string; isProduct: boolean }) => {
      const check = await checkUrl(offer.link)
      // Chet mem: trang san pham da go, shop day ve trang goc va van tra 200.
      // Chi ap cho trang san pham — xem `landedOnRoot` de biet vi sao vong chan
      // phai hep den vay.
      const softDead = offer.isProduct && check.ok && landedOnRoot(offer.link, check.finalUrl)
      try {
        // Khong ket luan duoc thi CHI cap nhat moc thoi gian, giu nguyen verdict cu.
        // Ghi de bang 'broken' se bien "shop tra loi cham" thanh "link chet" — xem
        // giai thich day du trong src/lib/checkOfferLink.ts. Van bump linkCheckedAt
        // de hang doi (order theo linkCheckedAt asc) di tiep, khong ket o mot shop.
        const patch: Record<string, string> = { linkCheckedAt: new Date().toISOString() }
        if (!check.indeterminate) patch.linkStatus = check.ok && !softDead ? 'ok' : 'broken'
        await writeClient.patch(offer.id).set(patch).commit()
        return { id: offer.id, ok: check.ok && !softDead, softDead, indeterminate: check.indeterminate ?? false }
      } catch (err) {
        return { id: offer.id, ok: false, error: String(err) }
      }
    })
  )

  return Response.json({ processed: results.length, results })
}
