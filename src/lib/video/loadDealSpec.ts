import 'server-only'
import { writeClient } from '@/sanity/writeClient'
import { couponForDealUrl, type StoreHostRow } from '@/lib/dealStoreMatch'
import { scrapeProductPage } from '@/lib/ai/scrapeProductPage'
import { buildSpec, type VideoSpec, type DealNguon } from '@/lib/video/buildSpec'

/**
 * Nap du lieu that cho mot deal roi dung kich ban video.
 *
 * Phan I/O nam o day, phan dung kich ban nam o `buildSpec.ts` (thuan, test duoc).
 * Trang `/admin/video` va lenh `npm run video:spec` deu di qua ham nay.
 */

/** Y HET `STORE_HOSTS_QUERY` trong src/sanity/queries.ts. */
const STORE_HOSTS = `*[_type == "store"]{
  "slug": slug.current, name, website, affiliateLink, category,
  "couponCode": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].couponCode,
  "couponOfferText": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].offerText
}`

export type KetQuaNap =
  | { ok: true; spec: VideoSpec; soAnh: number; maCoupon: string | null; canhBao: string[] }
  | { ok: false; error: string }

export async function loadDealSpec(dealCode: number): Promise<KetQuaNap> {
  const canhBao: string[] = []

  const deal = await writeClient.fetch<DealNguon & { anh?: string } | null>(
    `*[_type == "deal" && code == $code][0]{
      code, title, "slug": slug.current, priceSale, priceOrig, discount, dealUrl, store,
      "anh": image.asset->url
    }`,
    { code: dealCode },
    { cache: 'no-store' },
  )
  if (!deal) return { ok: false, error: `Khong tim thay deal #${dealCode}` }

  // ── Ma giam gia: doi chieu truc tiep trong store ─────────────────
  //
  // Dung dung `couponForDealUrl` — ham ma trang deal va trang review dang dung.
  // Tu viet mot phep khop domain thu hai la tao mot cho de lech.
  const stores = await writeClient.fetch<StoreHostRow[]>(STORE_HOSTS, {}, { cache: 'no-store' })
  const coupon = couponForDealUrl(deal.dealUrl, stores ?? [])

  // ── Anh: kho cho 1, trang san pham cho phan con lai ──────────────
  let images: string[] = []
  if (deal.dealUrl) {
    const r = await scrapeProductPage(deal.dealUrl)
    if ('error' in r) canhBao.push(`Khong cao duoc trang san pham: ${r.error}`)
    else images = r.images ?? []
  } else {
    canhBao.push('Deal khong co link san pham nen chi co mot anh')
  }
  // Anh trong kho luon dung dau — do la anh nguoi van hanh da chon.
  if (deal.anh) images = [deal.anh, ...images.filter(a => a !== deal.anh)]
  if (!images.length) return { ok: false, error: 'Deal khong co anh nao' }

  if (images.length < 4) canhBao.push(`Chi ${images.length} anh — video se ngan va lap lai anh`)
  if (!coupon?.code) canhBao.push('Shop khong co ma giam gia nen se bo scene ma')
  if (!deal.priceOrig) canhBao.push('Deal khong co gia goc nen se khong noi ve giam gia')

  return {
    ok: true,
    soAnh: images.length,
    maCoupon: coupon?.code ?? null,
    canhBao,
    spec: buildSpec({
      deal,
      images,
      couponCode: coupon?.code ?? null,
      storeName: coupon?.storeName ?? deal.store ?? null,
    }),
  }
}
