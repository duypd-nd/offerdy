import { parsePriceAmount, priceSymbol } from './priceAmount'

/**
 * "Bo ra bao nhieu tien quang cao thi co cua lai" — tinh TRUOC khi tieu dong nao.
 *
 * VI SAO CAN, va vi sao no tinh duoc ngay ca khi chua co du lieu don hang:
 * doanh thu affiliate that nam ben GoAffPro va site khong nhin thay (xem
 * `/admin/reports`), nen KHONG the tinh loi nhuan thuc te. Nhung cau hoi
 * *"de co lai thi dieu gi phai dung"* thi tra loi duoc — va no du de loai bot.
 *
 * Do lai 2026-08-28 (DA TACH THEO TIEN TE), cung CPC $0,50 va gia su hoa hong 10%:
 *   BodegaCooler  (don TB   $520) -> can 0,96% khach mua → co cua
 *   Dowinx        (don TB   €150) -> can ~3,1%           → kha thi
 *   Cloud Cushion (don TB    $48) -> can 10,5%           → gan nhu khong the
 *   Hunny Life    (don TB    $40) -> can 12,6%           → khong nen chay
 *   WoWGadgets99  (don TB ₹1.257 ≈ $15) -> can ~33%      → KHONG THE
 *
 * 🚨 BANG CU (10/08) GHI SAI VA DA SONG 18 NGAY: no ghi "WoWGadgets99 don TB
 * $1257 -> can 0,4% -> co cua", trong khi ₹1.257 chi la ~$15. Shop duoc khen
 * nhat hoa ra la shop te nhat trong ca nhom. Nguyen nhan o
 * `estimateAvgOrderValue()` — xem chu thich rieng cua ham do.
 *
 * ⚠️ Moi con so o day la DIEU KIEN CAN, khong phai du bao. No khong noi anh se
 * ban duoc bao nhieu; no noi anh phai ban duoc bao nhieu de khong lo.
 *
 * ⚠️ Va tat ca deu gia dinh `avgOrderValue` DA LA USD. Ham `breakEven()` khong
 * co cach nao biet don vi cua con so nguoi ta dua vao — do la dung cho ma loi
 * tren chui qua. Dung `estimateDungDuocLamUSD()` truoc khi dua so uoc luong vao.
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
 * USD kiem duoc moi don. Tach ra thanh ham rieng vi `adPerformance.ts` can dung
 * CHINH con so nay de quy doi mot luot bam sang merchant ra tien — hai noi tinh
 * lay moi noi mot kieu la tao mot cho lech, va cho lech o day khien mot chien
 * dich dang lo bi doc thanh dang lai.
 *
 * `null` khi thieu du lieu, KHONG phai 0 — cung ly do da ghi o `breakEven()`.
 */
export function earningsPerOrder(
  commissionRate?: number | null,
  avgOrderValue?: number | null
): number | null {
  if (commissionRate == null || avgOrderValue == null) return null
  if (!Number.isFinite(commissionRate) || !Number.isFinite(avgOrderValue)) return null
  if (commissionRate <= 0 || avgOrderValue <= 0) return null

  const value = avgOrderValue * (commissionRate / 100)
  return value > 0 ? value : null
}

/**
 * `null` khi thieu du lieu — KHONG tra ve 0 hay mot con so mac dinh. Mot bang
 * ke hoach quang cao hien "0%" cho shop chua khai hoa hong se duoc doc thanh
 * "shop nay hoa von de nhat", tuc dung nguoc han su that.
 *
 * ⚠️ `avgOrderValue` PHAI LA USD. Ham nay khong the tu kiem tra — mot con so
 * tran khong mang theo don vi. Do dung la cho ₹1.257 chui qua suot 18 ngay.
 */
export function breakEven({ commissionRate, avgOrderValue, cpc }: BreakEvenInput): BreakEvenResult | null {
  if (!Number.isFinite(cpc as number) || cpc <= 0) return null

  const earnings = earningsPerOrder(commissionRate, avgOrderValue)
  if (earnings == null) return null

  const breakEvenConversion = cpc / earnings
  return {
    earningsPerOrder: earnings,
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
 *
 * 🚨 NHAN CHUOI GIA, KHONG NHAN SO — sua 2026-08-28, va day la mot loi da chay
 * suot 18 ngay:
 *
 * Ban cu nhan `number[]` nen KHONG BIET TIEN TE. `parsePriceAmount()` doc dung
 * dau thap phan nhung tra ve SO THO — no khong quy doi tien. Trung binh cong so
 * tho cua mot shop ban bang rupee roi dua vao `breakEven()` (von coi tham so la
 * USD) cho ra:
 *
 *     wowgadgets99.com   ₹1.257  ->  doc thanh $1.257   (that ra ~$15, sai 83 lan)
 *
 * Va no de ra ket luan nguoc han: "WoWGadgets99 chi can 0,4% khach mua -> co cua"
 * trong khi su that la ~33% -> khong the. Shop bi khen nhat hoa ra la shop te
 * nhat. Con so do da nam trong `TODO.md`, trong chu thich file nay va trong
 * `tests/adPlanner.test.ts` suot 18 ngay ma khong ai nghi ngo, vi mot con so
 * "$1.257" trong hoan toan hop ly.
 *
 * Nen ham nay nay tu doc chuoi bang `parsePriceAmount` + `priceSymbol` — MOT bo
 * doc gia duy nhat cho ca site, dung luat da ghi o `priceAmount.ts`.
 *
 * Gap NHIEU tien te thi lay nhom DONG NHAT va bao bao nhieu deal bi bo qua, thay
 * vi tron chung lai. Tron la cach sinh ra dung con so vo nghia o tren.
 */
export type AovEstimate = {
  avg: number
  /** So deal DA DUNG de tinh — chi tinh nhom cung mot tien te. */
  count: number
  /** Ky hieu tien te cua con so `avg`. **KHONG mac dinh la USD.** */
  symbol: string
  /** So deal bi bo qua vi thuoc tien te khac. > 0 la dau hieu du lieu shop lon xon. */
  skipped: number
}

export function estimateAvgOrderValue(priceStrings: (string | null | undefined)[]): AovEstimate | null {
  // Gom theo ky hieu tien te truoc, roi moi lay trung binh TRONG tung nhom.
  const nhom = new Map<string, number[]>()
  for (const raw of priceStrings) {
    const amount = parsePriceAmount(raw ?? undefined)
    if (amount == null || !Number.isFinite(amount) || amount <= 0) continue
    const sym = priceSymbol(raw ?? undefined)
    const list = nhom.get(sym)
    if (list) list.push(amount)
    else nhom.set(sym, [amount])
  }
  if (nhom.size === 0) return null

  let symbol = ''
  let best: number[] = []
  let tong = 0
  for (const [sym, list] of nhom) {
    tong += list.length
    if (list.length > best.length) { best = list; symbol = sym }
  }

  return {
    avg: best.reduce((a, b) => a + b, 0) / best.length,
    count: best.length,
    symbol,
    skipped: tong - best.length,
  }
}

/**
 * Con so uoc luong nay co dung duoc lam `avgOrderValue` (USD) cho `breakEven()` khong?
 *
 * Chi `$` moi dung thang duoc. `€`/`£` xap xi USD nhung van lech 5-20%, va `₹`/`₫`
 * lech HANG CHUC LAN — mot con so lech 83 lan khong phai sai so, no la mot ket
 * luan nguoc. Tien te khac thi nguoi van hanh phai tu quy doi va go vao o
 * `avgOrderValue`; so that luon thang so uoc luong.
 */
export function estimateDungDuocLamUSD(est: AovEstimate | null): boolean {
  return est != null && est.symbol === '$'
}
