/**
 * "Bo ra bao nhieu tien quang cao thi co cua lai" — tinh TRUOC khi tieu dong nao.
 *
 * VI SAO CAN, va vi sao no tinh duoc ngay ca khi chua co du lieu don hang:
 * doanh thu affiliate that nam ben GoAffPro va site khong nhin thay (xem
 * `/admin/reports`), nen KHONG the tinh loi nhuan thuc te. Nhung cau hoi
 * *"de co lai thi dieu gi phai dung"* thi tra loi duoc — va no du de loai bot.
 *
 * Do tren du lieu that 2026-08-10, cung CPC $0,50 va gia su hoa hong 10%:
 *   WoWGadgets99 (don TB $1257) -> can 0,4% khach mua  → co cua
 *   Dowinx        (don TB $150) -> can 3,3%            → kha thi
 *   Cloud Cushion (don TB $48)  -> can 10,5%           → gan nhu khong the
 *   Hunny Life    (don TB $40)  -> can 12,6%           → khong nen chay
 * Ba shop cuoi bi loai ma khong ton mot dong nao.
 *
 * ⚠️ Moi con so o day la DIEU KIEN CAN, khong phai du bao. No khong noi anh se
 * ban duoc bao nhieu; no noi anh phai ban duoc bao nhieu de khong lo.
 */

/** Nguong danh gia — dat theo tim ty le chuyen doi thuc te cua traffic coupon. */
const GOOD_MAX = 0.02  // ≤2% : traffic coupon thuong dat duoc
const TIGHT_MAX = 0.05 // ≤5% : can nhung khong phi ly

export type BreakEvenVerdict = 'good' | 'tight' | 'hopeless' | 'unknown'

export type BreakEvenInput = {
  /** Phan tram, 0..100. */
  commissionRate?: number | null
  /** USD. */
  avgOrderValue?: number | null
  /** USD cho mot luot bam quang cao. */
  cpc: number
}

export type BreakEvenResult = {
  /** USD kiem duoc moi don. */
  earningsPerOrder: number
  /** Ty le khach-vao-site thanh don CAN DAT de hoa von, 0..1. */
  breakEvenConversion: number
  verdict: Exclude<BreakEvenVerdict, 'unknown'>
}

/**
 * `null` khi thieu du lieu — KHONG tra ve 0 hay mot con so mac dinh. Mot bang
 * ke hoach quang cao hien "0%" cho shop chua khai hoa hong se duoc doc thanh
 * "shop nay hoa von de nhat", tuc dung nguoc han su that.
 */
export function breakEven({ commissionRate, avgOrderValue, cpc }: BreakEvenInput): BreakEvenResult | null {
  if (!Number.isFinite(cpc as number) || cpc <= 0) return null
  if (commissionRate == null || avgOrderValue == null) return null
  if (!Number.isFinite(commissionRate) || !Number.isFinite(avgOrderValue)) return null
  if (commissionRate <= 0 || avgOrderValue <= 0) return null

  const earningsPerOrder = avgOrderValue * (commissionRate / 100)
  if (earningsPerOrder <= 0) return null

  const breakEvenConversion = cpc / earningsPerOrder
  return {
    earningsPerOrder,
    breakEvenConversion,
    verdict:
      breakEvenConversion <= GOOD_MAX ? 'good'
      : breakEvenConversion <= TIGHT_MAX ? 'tight'
      : 'hopeless',
  }
}

export type DailyPlan = {
  /** So luot bam mua duoc voi ngan sach do. */
  clicks: number
  /** So don CAN CO trong ngay de hoa von. */
  ordersNeeded: number
}

/**
 * Doi ngan sach ngay thanh hai con so nguoi van hanh cam duoc: mua duoc bao nhieu
 * luot bam, va can bao nhieu don de khong lo.
 *
 * `ordersNeeded` lam tron LEN: nua don khong ton tai, va lam tron xuong se ve ra
 * mot buc tranh de chiu hon su that.
 */
export function dailyPlan(budget: number, cpc: number, earningsPerOrder: number): DailyPlan | null {
  if (![budget, cpc, earningsPerOrder].every(n => Number.isFinite(n) && n > 0)) return null
  return {
    clicks: Math.floor(budget / cpc),
    ordersNeeded: Math.ceil(budget / earningsPerOrder),
  }
}

/**
 * Uoc luong gia tri don trung binh tu chinh gia deal cua shop.
 *
 * Vi sao khong bat nguoi van hanh go tay: chua co don nao thi GoAffPro cung khong
 * biet con so nay, con gia thi da nam san trong 175/175 deal. Suy ra duoc thi dung
 * suy ra — cung nguyen tac voi `dealStoreMatch.ts`.
 *
 * ⚠️ Tra ve ca `count` chu khong chi so tien: trung binh tren 1-2 deal khong dang
 * tin, va giao dien phai noi ro dieu do thay vi in ra mot con so trong nhu chac
 * chan. `null` khi khong co gia nao.
 */
export function estimateAvgOrderValue(prices: (number | null)[]): { avg: number; count: number } | null {
  const valid = prices.filter((p): p is number => p != null && Number.isFinite(p) && p > 0)
  if (valid.length === 0) return null
  return { avg: valid.reduce((a, b) => a + b, 0) / valid.length, count: valid.length }
}
