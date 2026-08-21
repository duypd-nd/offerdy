import 'server-only'
import { writeClient } from '@/sanity/writeClient'
import { couponForDealUrl, type StoreHostRow } from '@/lib/dealStoreMatch'
import { scrapeProductPage } from '@/lib/ai/scrapeProductPage'
import { buildSpec, type VideoSpec, type DealNguon } from '@/lib/video/buildSpec'
import { generateVideoScript } from '@/lib/ai/generateVideoScript'

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
  let moTa: string | null = null
  let rating: number | undefined
  let reviewCount: number | undefined
  if (deal.dealUrl) {
    const r = await scrapeProductPage(deal.dealUrl)
    if ('error' in r) canhBao.push(`Khong cao duoc trang san pham: ${r.error}`)
    else {
      images = r.images ?? []
      moTa = r.description ?? null
      rating = r.rating
      reviewCount = r.reviewCount
    }
  } else {
    canhBao.push('Deal khong co link san pham nen chi co mot anh')
  }
  // Anh trong kho luon dung dau — do la anh nguoi van hanh da chon.
  if (deal.anh) images = [deal.anh, ...images.filter(a => a !== deal.anh)]
  if (!images.length) return { ok: false, error: 'Deal khong co anh nao' }

  if (images.length < 4) canhBao.push(`Chi ${images.length} anh — mot so anh se duoc dung lai o nhieu canh`)
  if (!coupon?.code) canhBao.push('Shop khong co ma giam gia nen se bo canh ma')
  if (!deal.priceOrig) canhBao.push('Deal khong co gia goc nen se khong noi ve giam gia')
  if (rating === undefined) canhBao.push('Trang san pham khong khai danh gia nen se bo canh social proof')
  if (!moTa) canhBao.push('Trang san pham khong co mo ta — loi doc se chung chung hon')

  const shop = coupon?.storeName ?? deal.store ?? 'the store'

  // ── Loi doc do AI viet, khong phai mau cau ──────────────────────
  //
  // ⚠️ `verifiedFacts` la hang rao: AI chi duoc dung so nam trong do, va
  // `kiemTraKichBan()` bat lai moi con so trong dau ra de doi chieu. Gia va ma
  // coupon KHONG do AI viet — code noi them cac canh do vao sau, tu du lieu kho.
  const suThat = suThatCuaDeal(deal, coupon?.code ?? null, images.length, rating, reviewCount)
  const beats = await generateVideoScript({
    ten: String(deal.title).split('—')[0].trim(),
    shop,
    moTa,
    // Chua tinh canh gia / ma / CTA — chung duoc noi them sau, moi canh ~4 giay.
    giayMucTieu: 26,
    suThatDaKiemChung: suThat,
    rating,
    reviewCount,
  })

  return {
    ok: true,
    soAnh: images.length,
    maCoupon: coupon?.code ?? null,
    canhBao,
    spec: buildSpec({
      deal,
      images,
      beats,
      couponCode: coupon?.code ?? null,
      storeName: shop,
    }),
  }
}

/** Nhung gi AI duoc phep noi. Moi thu khac deu la bia. */
function suThatCuaDeal(
  deal: DealNguon, ma: string | null, soAnh: number,
  rating?: number, reviewCount?: number,
): string[] {
  const ra = [
    `Product name: ${deal.title}`,
    deal.priceSale ? `Current price: ${deal.priceSale}` : 'No price available — do not mention price',
    deal.priceOrig ? `Original price: ${deal.priceOrig}` : 'No original price — do not mention any discount',
    deal.discount ? `Discount: ${deal.discount}% off` : 'No discount percentage available',
    ma ? `The store has coupon code ${ma} (store-wide, may exclude sale items)` : 'No coupon code',
    `${soAnh} product photos available`,
  ]
  if (rating !== undefined && reviewCount !== undefined) {
    ra.push(`Real rating: ${rating} out of 5 from ${reviewCount} reviews`)
  } else {
    ra.push('No rating or review data — do not mention what other customers think')
  }
  return ra
}
