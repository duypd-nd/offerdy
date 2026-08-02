/**
 * Hang doi viec cua admin — MOT truy van duy nhat, dung chung cho ca dashboard
 * (/admin) va huy hieu so tren thanh ben.
 *
 * Vi sao gom vao mot cho: truoc day dashboard chi dem kho (84 store, 326 offer)
 * con moi thu CAN LAM — muc cho duyet, offer sap het han, offer thieu mo ta —
 * nam sau 1-2 lop menu va khong co dau hieu gi o ngoai. Mo admin ra khong biet
 * hom nay phai lam gi.
 *
 * Doc KHONG qua CDN: cac so nay la co so de quyet dinh hanh dong, va CDN mat vai
 * chuc giay moi thay luot ghi vua xong — duyet xong mot muc ma huy hieu van bao
 * "1 cho duyet" se khien nguoi dung bam vao lan nua.
 */
import { client } from '@/sanity/client'
import { adminInputToIso, isoToAdminInput } from '@/lib/adminDateTime'

const freshClient = client.withConfig({ useCdn: false })

export type AdminWorkQueue = {
  /** Cho duyet o /admin/ai-review, tach theo tung tab */
  pendingStores: number
  pendingOffers: number
  pendingDeals: number
  pendingTotal: number
  /** Click affiliate (khong tinh luot mo short link) */
  clicksToday: number
  clicks7d: number
  /** Offer dang bat nhung da qua han — van hien tren web, phai xu ly ngay */
  expiredOffers: number
  /** Offer het han trong 7 ngay toi */
  expiringOffers: number
  /** Offer dang bat ma chua co mo ta chi tiet */
  missingDescription: number
  /** Offer co link da kiem tra va bi hong */
  brokenLinks: number
  /** Offer dang bat nhung chua danh dau da kiem chung */
  unverifiedOffers: number
  /** Nguoi dang ky nhan ma chua duoc gui */
  pendingAlerts: number
}

const EMPTY: AdminWorkQueue = {
  pendingStores: 0, pendingOffers: 0, pendingDeals: 0, pendingTotal: 0,
  clicksToday: 0, clicks7d: 0,
  expiredOffers: 0, expiringOffers: 0, missingDescription: 0,
  brokenLinks: 0, unverifiedOffers: 0, pendingAlerts: 0,
}

/**
 * 00:00 hom nay theo GIO VN, tra ve ISO UTC.
 *
 * Khong dung `new Date(y, m, d)` nhu trang bao cao: tren Vercel gio may la UTC,
 * nen "hom nay" o do bat dau luc 07:00 sang gio VN. Ca hai deu duoc goi la "hom
 * nay" tren cung mot man hinh thi phai cung mot moc.
 */
export function startOfAdminDay(now: Date): string {
  const localDate = isoToAdminInput(now.toISOString()).slice(0, 10)
  return adminInputToIso(`${localDate}T00:00`) ?? now.toISOString()
}

// `verified == false` chu khong phai `verified != true`: schema mac dinh bat
// verified, va offer cu (truoc khi co truong nay) khong he co `verified` — coi
// chung la "chua kiem chung" se bao dong ca tram muc chua bao gio co van de.
const QUERY = `{
  "pendingStores": count(*[_type == "store" && aiReviewStatus == "pending"]),
  "pendingOffers": count(*[_type == "offer" && aiReviewStatus == "pending"]),
  "pendingDeals": count(*[_type == "deal" && aiReviewStatus == "pending"]),
  "clicksToday": count(*[_type == "click" && kind != "shortlink" && _createdAt >= $startOfToday]),
  "clicks7d": count(*[_type == "click" && kind != "shortlink" && _createdAt >= $sevenDaysAgo]),
  "expiredOffers": count(*[_type == "offer" && active == true && defined(expiresAt) && expiresAt < now()]),
  "expiringOffers": count(*[_type == "offer" && active == true && defined(expiresAt) && expiresAt >= now() && expiresAt <= $inSevenDays]),
  "missingDescription": count(*[_type == "offer" && active == true && (!defined(description) || description == "")]),
  "brokenLinks": count(*[_type == "offer" && active == true && linkStatus == "broken"]),
  "unverifiedOffers": count(*[_type == "offer" && active == true && verified == false]),
  "pendingAlerts": count(*[_type == "couponAlert" && !defined(notifiedAt)])
}`

/**
 * Khong bao gio nem: thanh ben nam trong layout cua MOI trang admin, mot loi
 * mang o day se lam trang trang toan bo khu quan tri. Hong thi tra ve so 0 —
 * huy hieu bien mat, phan con lai van dung duoc.
 */
export async function getAdminWorkQueue(now: Date): Promise<AdminWorkQueue> {
  try {
    const data = await freshClient.fetch<Omit<AdminWorkQueue, 'pendingTotal'>>(QUERY, {
      startOfToday: startOfAdminDay(now),
      sevenDaysAgo: new Date(now.getTime() - 7 * 86400000).toISOString(),
      inSevenDays: new Date(now.getTime() + 7 * 86400000).toISOString(),
    })
    if (!data) return EMPTY
    return {
      ...data,
      pendingTotal: data.pendingStores + data.pendingOffers + data.pendingDeals,
    }
  } catch {
    return EMPTY
  }
}
