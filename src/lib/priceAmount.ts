/**
 * Đọc con số ra khỏi một chuỗi giá, **hiểu cả hai lối viết số thập phân**.
 *
 * Cả site lưu giá dưới dạng chuỗi đã có ký hiệu (`"€199,99"`, `"$1,299.99"`,
 * `"Rp4.961.899"`). Cách bóc số cũ — `parseFloat(s.replace(/[^0-9.]/g, ''))` — vứt
 * bỏ dấu phẩy thay vì hiểu nó, và mỗi nơi trong repo lại chép lại đúng một bản.
 *
 * ⚠️ Đây không phải lỗi làm tròn. Đo thật trên dữ liệu của chính dự án:
 *
 *     €199,99  −  €149,99   →  "Save €5000"   (đúng ra là €50)
 *     ₫250.000 −  ₫200.000  →  "Save ₫50"     (đúng ra là ₫50.000)
 *     Rp4.961.899 − Rp3.961.899 → "Save Rp1"  (đúng ra là Rp1.000.000)
 *
 * Con số đó không chỉ nằm trong ô admin: `dealDiscountBadge` in nó lên thẻ deal ở
 * /deals, lên ảnh Open Graph, và vào caption mạng xã hội. Một lời hứa giảm giá sai
 * gấp trăm lần là thứ người mua bấm vào rồi mới biết mình bị lừa.
 *
 * Phần trăm sống sót được qua lỗi này chỉ vì nó là TỈ SỐ — hai giá cùng bị nhân 100
 * thì thương không đổi. Đúng do may, không phải do đúng.
 */

/** Ký hiệu tiền tệ đứng trước con số: `"€199,99"` → `"€"`, `"Rp4.961"` → `"Rp"`. */
export function priceSymbol(str?: string, fallback = '$'): string {
  const prefix = str?.match(/^[^0-9]+/)?.[0]?.trim()
  return prefix || fallback
}

/**
 * `"€199,99"` → `199.99`. Không đọc được thì `null` — **không đoán bừa 0**: một số 0
 * lặng lẽ sẽ thành "Save €200" thay vì không hiện gì.
 *
 * Luật phân biệt dấu thập phân với dấu ngăn nghìn, theo đúng thứ tự:
 *
 *  1. Có CẢ `.` lẫn `,` → dấu đứng SAU cùng là dấu thập phân (`1.299,99` ↔ `1,299.99`).
 *  2. Chỉ một loại, xuất hiện NHIỀU lần → chắc chắn là ngăn nghìn (`4.961.899`).
 *  3. Chỉ một loại, một lần:
 *     - sau nó đúng 3 chữ số → ngăn nghìn (`₫250.000`, `$1,299`).
 *     - sau nó 1–2 chữ số  → thập phân (`€199,99`, `$50.5`).
 *
 * Luật (3) là chỗ duy nhất còn nhập nhằng thật: `"$1.500"` có thể là một nghìn rưỡi
 * đô hoặc một đô rưỡi. Chọn "ngăn nghìn" vì vế kia là một mức giá không ai đăng, và
 * vì đọc nhầm theo hướng này chỉ sai một lần cho một chuỗi vốn đã mơ hồ — còn đọc
 * nhầm ngược lại thì mọi giá VND/IDR (luôn viết `250.000`) đều sai gấp nghìn lần.
 */
export function parsePriceAmount(str?: string): number | null {
  if (!str) return null
  // Chỉ giữ chữ số và hai dấu ngăn. Ký hiệu tiền tệ, khoảng trắng không ngắt dòng,
  // chữ "VAT"… đều bị bỏ ở đây.
  const raw = String(str).replace(/[^\d.,]/g, '')
  if (!/\d/.test(raw)) return null

  const lastDot = raw.lastIndexOf('.')
  const lastComma = raw.lastIndexOf(',')
  let decimalAt = -1

  if (lastDot >= 0 && lastComma >= 0) {
    decimalAt = Math.max(lastDot, lastComma)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ','
    const count = raw.split(sep).length - 1
    const digitsAfter = raw.length - 1 - raw.lastIndexOf(sep)
    if (count === 1 && digitsAfter !== 3) decimalAt = raw.lastIndexOf(sep)
  }

  const whole = (decimalAt >= 0 ? raw.slice(0, decimalAt) : raw).replace(/[.,]/g, '')
  const frac = decimalAt >= 0 ? raw.slice(decimalAt + 1).replace(/[.,]/g, '') : ''
  const amount = Number(frac ? `${whole || '0'}.${frac}` : whole)
  return Number.isFinite(amount) ? amount : null
}

/**
 * Con số ngắn gọn nhất mà vẫn đúng: `50` → `"50"`, `50.5` → `"50.5"`, `50.00` → `"50"`.
 *
 * ⚠️ Không `Math.round`. Bản cũ làm tròn nên `€50,50` in ra "Save €51" — **nói quá**
 * mức giảm, và đó là một khẳng định sai trên trang công khai. Cắt số 0 thừa cho gọn
 * là việc của hiển thị; làm tròn lên là chuyện khác hẳn.
 */
export function formatAmount(amount: number): string {
  return String(Number(amount.toFixed(2)))
}
