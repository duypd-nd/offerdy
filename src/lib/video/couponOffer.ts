/**
 * Đọc mức ưu đãi ra khỏi `offerText` của một mã coupon.
 *
 * ⚠️ Vì sao phải có module riêng thay vì bóc tại chỗ: con số này được **nói ra
 * miệng** trong video và **in lên màn hình** ở cảnh cuối. Một mức giảm đọc sai
 * là một lời hứa sai với người mua — nặng hơn hẳn một con số lệch trong trang
 * admin. Nên nó là hàm thuần, có test, và **trả `null` khi không chắc** thay vì
 * đoán bừa.
 *
 * Dữ liệu thật trong kho (98 offer có mã, đo 2026-08-23) chỉ có hai lối viết:
 *
 *     "15% Off"          -> phần trăm
 *     "10% Off"          -> phần trăm
 *     "15% de réduction" -> phần trăm (tiếng Pháp)
 *     "€10 Off"          -> số tiền
 *     "$10 Off"          -> số tiền
 *     "€25 Off"          -> số tiền
 *
 * Gặp bất kỳ dạng nào khác thì **không nói gì về mức giảm** — cảnh mã vẫn chạy,
 * chỉ là không kèm con số. Im lặng luôn an toàn hơn đoán.
 */

import { parsePriceAmount, priceSymbol, formatAmount } from '@/lib/priceAmount'

export type UuDaiMa =
  /** `phanTram: 5` cho "5% Off". */
  | { kieu: 'phan-tram'; phanTram: number; hienThi: string; docLen: string }
  /** Số tiền cố định, ví dụ "€10 Off". */
  | { kieu: 'so-tien'; hienThi: string; docLen: string }

/**
 * ⚠️ Chặn trên 95%: dữ liệu thật cao nhất là 25%. Một chuỗi như "Save up to
 * 100%" hay một lỗi nhập liệu thành "150% Off" mà lọt lên video là lời hứa
 * không ai giữ được. Trên ngưỡng thì coi như không đọc được.
 */
const PHAN_TRAM_TOI_DA = 95

export function docUuDaiMa(offerText?: string | null): UuDaiMa | null {
  const chu = String(offerText ?? '').trim()
  if (!chu) return null

  // ── Phần trăm ────────────────────────────────────────────────────
  //
  // ⚠️ `[.,]` vì cả hai lối viết thập phân đều có thể xuất hiện ("7,5%" và
  // "7.5%"). Chuẩn hoá về dấu chấm trước khi đọc số.
  const mPt = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/.exec(chu)
  if (mPt) {
    const so = Number(mPt[1].replace(',', '.'))
    if (!Number.isFinite(so) || so <= 0 || so > PHAN_TRAM_TOI_DA) return null
    // Bỏ số 0 thừa: 10.0 -> "10", 7.5 -> "7.5".
    const gon = String(Number(so.toFixed(2)))
    return {
      kieu: 'phan-tram',
      phanTram: so,
      hienThi: `${gon}% OFF`,
      // "5 percent" chứ không phải "5%" — máy đọc phát âm ký hiệu rất tệ.
      docLen: `${gon} percent`,
    }
  }

  // ── Số tiền cố định ──────────────────────────────────────────────
  //
  // ⚠️ Đi qua `parsePriceAmount` chứ không tự bóc số: nó là bộ đọc giá DUY NHẤT
  // của dự án và là nơi duy nhất hiểu đúng `€199,99` khác `$1,299`. Tự bóc ở
  // đây là chép lại đúng cái lỗi từng in ra "Save €5000".
  if (/[€$£¥₫]|\bRp\b|\bUSD\b|\bEUR\b|\bGBP\b/i.test(chu)) {
    const so = parsePriceAmount(chu)
    if (so === null || so <= 0) return null
    const kyHieu = priceSymbol(chu)
    const soGon = formatAmount(so)
    return {
      kieu: 'so-tien',
      hienThi: `${kyHieu}${soGon} OFF`,
      docLen: docTien(kyHieu, soGon),
    }
  }

  return null
}

/**
 * "€" + "10" -> "10 euro". Cùng quy ước với `docGia()` trong `buildSpec.ts`.
 *
 * ⚠️ Không gọi thẳng `docGia()` vì hàm đó nhận cả chuỗi giá còn nguyên ký hiệu,
 * còn ở đây số đã tách rồi. Ghép lại chuỗi chỉ để bóc ra là đi vòng vô ích.
 */
function docTien(kyHieu: string, soGon: string): string {
  const donVi = kyHieu === '€' ? 'euro' : kyHieu === '£' ? 'pounds' : 'dollars'
  const [nguyen, le] = soGon.split('.')
  return le ? `${nguyen} ${donVi} ${le}` : `${nguyen} ${donVi}`
}
