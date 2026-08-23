import { client } from '@/sanity/client'
import SocialKitClient, { type KitDeal } from './SocialKitClient'
import { getDealCouponsBatch } from '@/sanity/queries'

export const dynamic = 'force-dynamic'

/** Deal doc tu Sanity, TRUOC khi ghep ma coupon vao. */
type KitDealRaw = Omit<KitDeal, 'couponCode' | 'couponOfferText'> & { dealUrl?: string }

/**
 * ⚠️ `useCdn: false` — đo thật 23/08: tick "đã đăng" ghi xong, đọc lại bằng CDN
 * vẫn trả bản CŨ nên tải lại trang thì dấu BIẾN MẤT, trông như không lưu được.
 * `force-dynamic` không cứu được: nó bỏ cache của Next, còn đây là cache của
 * Sanity. Dùng `withConfig` thay vì `writeClient` để đường đọc này không cần
 * token ghi — cùng lý do đã ghi ở /admin/ai-review và /admin/video.
 *
 * Đây là lần THỨ HAI cùng một cái bẫy trong ngày. Mọi trang admin vừa-ghi-vừa-đọc
 * đều phải soi điểm này.
 */
const readClient = client.withConfig({ useCdn: false })

// Chi deal DA CO MA moi dung duoc o day: ca caption, short link va QR deu dua tren
// ma. Deal thieu ma -> chay /admin/migrate/deal-codes truoc.
const QUERY = `*[_type == "deal" && defined(code)] | order(code desc) {
  code, title, priceSale, priceOrig, discount, discountByAmount,
  "slug": slug.current, "imageUrl": image.asset->url,
  "categoryName": category->name,
  "shortLinkClicks": coalesce(shortLinkClicks, 0),
  "dealClicks": coalesce(dealClicks, 0),
  store, dealUrl,
  "daDangLuc": lastPostedAt,
  "coDealUrl": defined(dealUrl)
}`
// Ba o cuoi truy van tren la cho COT TRAI, de no giong het cot cua /admin/video:
// ten shop + dau "da dang". Con `coDealUrl` quyet dinh co lay duoc bo anh san
// pham hay khong — khong co link thi khong co gi de cao ve.
//
// ⚠️ Chu thich phai nam NGOAI chuoi: mot dau backtick trong template literal la
// dong chuoi lai giua chung. Da mac loi nay hai lan trong ngay.

const MISSING_CODE_QUERY = `count(*[_type == "deal" && !defined(code)])`

export default async function SocialKitPage({ searchParams }: {
  searchParams: Promise<{ code?: string }>
}) {
  const [deals, missingCode, params] = await Promise.all([
    readClient.fetch<KitDealRaw[]>(QUERY),
    readClient.fetch<number>(MISSING_CODE_QUERY),
    searchParams,
  ])

  // ⚠️ Ma coupon khop theo DOMAIN cua `dealUrl`, khong phai theo ten shop. Dung
  // dung `couponForDealUrl` ma trang deal va trang review dang dung (goi qua
  // `getDealCouponsBatch`) — tu viet mot phep khop thu hai la tao mot cho de lech,
  // va cho lech o day nghia la hien ma cua SHOP KHAC len caption, tuc dua nguoi
  // mua di nhap mot ma khong bao gio ap duoc.
  const ds = deals ?? []
  const coupons = await getDealCouponsBatch(ds.map(d => d.dealUrl))
  const kem = ds.map((d, i) => ({
    ...d,
    couponCode: coupons[i]?.code,
    couponOfferText: coupons[i]?.offerText,
  }))
  // `?code=` de nut 📣 tren /admin/deals nhay thang sang day voi deal da chon san —
  // them deal roi dang bai la mot chuoi lam lien nhau, truoc day phai tim lai ma.
  const initialCode = Number(params?.code)
  return (
    <SocialKitClient
      deals={kem}
      missingCode={missingCode ?? 0}
      initialCode={Number.isFinite(initialCode) && initialCode > 0 ? initialCode : undefined}
    />
  )
}
