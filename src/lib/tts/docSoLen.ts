/**
 * Chuyển con số thành chữ để ĐỌC LÊN. Hàm thuần.
 *
 * ── VÌ SAO CẦN, VÀ VÌ SAO KHÔNG ĐỂ MÔ HÌNH TỰ LO ───────────────────
 *
 * Bộ đọc thành tiếng phát âm `$14.99` là "dollar fourteen point nine nine" hoặc
 * "one four point nine nine" tuỳ hôm — không phải "fourteen ninety nine" như
 * người thật nói. Một video mười lăm giây mà câu chốt giá nghe như máy đọc số
 * thì hỏng đúng chỗ quan trọng nhất.
 *
 * Cách chữa hiển nhiên là bảo AI viết luôn "fourteen ninety nine". Nhưng đó
 * chính là điều luật 2 cấm: **AI không bao giờ được tự viết con số.** Cả bộ
 * caption đã dựng trên nguyên tắc đó — mô hình đặt `{price}`, code thay bằng
 * giá thật lấy từ database. File này giữ nguyên nguyên tắc ấy cho lời đọc: mô
 * hình vẫn đặt `{price}`, chỉ khác là code thay bằng **dạng đọc** thay vì dạng
 * viết. Không có đường nào để một con số bịa lọt vào tai người nghe.
 *
 * ⚠️ Đọc giá phải qua `parsePriceAmount` — cùng một bộ đọc giá mà thẻ deal, ảnh
 * OG và dữ liệu có cấu trúc đang dùng. `€199,99` từng bị một bộ đọc thứ hai
 * hiểu thành "Save €5000"; đó là lý do dự án chỉ cho phép một bộ đọc giá.
 */
import { parsePriceAmount, priceSymbol } from '@/lib/priceAmount'

const DON_VI = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const CHUC = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** Số nguyên 0–999 999 thành chữ. Trên ngưỡng đó thì trả chuỗi số như cũ. */
export function soNguyenThanhChu(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n)
  n = Math.floor(n)
  if (n >= 1_000_000) return String(n)
  if (n < 20) return DON_VI[n]
  if (n < 100) {
    const c = CHUC[Math.floor(n / 10)]
    const d = n % 10
    return d ? `${c}-${DON_VI[d]}` : c
  }
  if (n < 1000) {
    const t = `${DON_VI[Math.floor(n / 100)]} hundred`
    const con = n % 100
    return con ? `${t} ${soNguyenThanhChu(con)}` : t
  }
  const ngan = `${soNguyenThanhChu(Math.floor(n / 1000))} thousand`
  const con = n % 1000
  return con ? `${ngan} ${soNguyenThanhChu(con)}` : ngan
}

/**
 * Giá thành chữ để đọc.
 *
 * Theo đúng cách người Mỹ nói giá, không theo cách viết:
 *   $14.99  -> "fourteen ninety nine"      (không phải "fourteen point nine nine")
 *   $15     -> "fifteen dollars"           (số tròn thì phải có đơn vị, kẻo trống nghĩa)
 *   $199.00 -> "one hundred ninety-nine dollars"
 *   $8.05   -> "eight oh five"              (xu dưới 10 đọc là "oh …")
 *
 * ⚠️ Chỉ làm dạng đọc kiểu Mỹ cho `$`. Tiền khác thì đọc số rồi gọi tên đơn vị —
 * "one hundred ninety-nine euros". Bịa ra nếp đọc bản địa cho một đồng tiền
 * không biết chắc thì tệ hơn là đọc mộc.
 */
export function docGiaLen(gia?: string): string {
  const so = parsePriceAmount(gia)
  if (so === null) return (gia ?? '').trim()

  const kyHieu = priceSymbol(gia, '$')
  const nguyen = Math.floor(so)
  const xu = Math.round((so - nguyen) * 100)
  const ten = TEN_TIEN[kyHieu]

  if (xu === 0) {
    const donVi = ten ? ` ${nguyen === 1 ? ten.mot : ten.nhieu}` : ''
    return `${soNguyenThanhChu(nguyen)}${donVi}`
  }
  // "fourteen ninety nine" — hai vế đọc liền, không có tên đơn vị ở giữa. Thêm
  // "dollars" vào đây ("fourteen dollars ninety nine") nghe như đọc hoá đơn.
  const veXu = xu < 10 ? `oh ${DON_VI[xu]}` : soNguyenThanhChu(xu)
  return `${soNguyenThanhChu(nguyen)} ${veXu}`
}

const TEN_TIEN: Record<string, { mot: string; nhieu: string }> = {
  $: { mot: 'dollar', nhieu: 'dollars' },
  '£': { mot: 'pound', nhieu: 'pounds' },
  '€': { mot: 'euro', nhieu: 'euros' },
}

/** "50% OFF" -> "fifty percent off". Chỉ nhận số nguyên phần trăm. */
export function docPhanTramLen(pt: number): string {
  return `${soNguyenThanhChu(Math.round(pt))} percent`
}

/**
 * Mã sản phẩm đọc từng chữ số: "1178" -> "one one seven eight".
 *
 * Đọc thành "one thousand one hundred seventy-eight" thì người nghe không gõ lại
 * được vào ô tìm kiếm — mà gõ lại được chính là toàn bộ mục đích của con số này.
 */
export function docMaLen(ma: number): string {
  return String(Math.abs(Math.floor(ma))).split('').map(d => DON_VI[Number(d)]).join(' ')
}
