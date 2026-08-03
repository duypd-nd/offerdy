/**
 * Chuan hoa gia doc duoc tu trang san pham thanh chuoi hien thi.
 *
 * JSON-LD tra ve gia dang so tran ("28.99") va ma tien te rieng ("USD"), trong khi
 * ca site luu gia duoi dang chuoi da co ky hieu ("$28.99") — dealDiscountBadge va
 * calcDiscount deu doc chuoi do. Nen phai ghep lai o day.
 *
 * De o file rieng thay vi trong actions.ts vi module `'use server'` chi duoc export
 * ham async — mot helper dong bo o day se lam vo build. Va tach ra thi test duoc.
 */

const SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', VND: '₫', CAD: 'CA$', AUD: 'A$',
}

/**
 * Doi gia tu don vi NHO cua tien te ve don vi chinh: 2999 -> "29.99".
 *
 * Ca Shopify (`/products/<handle>.js`) lan WooCommerce (Store API) deu tra gia o
 * don vi nho. Doc thang con so do la gia gap 100 lan tren the deal.
 *
 * `minorUnit` khac nhau theo tien te — Woo tu khai (`currency_minor_unit`): USD 2,
 * JPY 0. Chia cung cho 100 la sai voi JPY. Shopify khong khai thi mac dinh 2.
 */
export function fromMinorUnits(value: unknown, minorUnit = 2): string | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return undefined
  const unit = Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4 ? minorUnit : 2
  return String(n / 10 ** unit)
}

export function formatScrapedPrice(price?: string, currency?: string): string | undefined {
  if (!price) return undefined
  // Bo moi thu khong phai so/dau cham: gia co the den kem ky hieu, dau phay ngan
  // cach nghin, hoac khoang trang khong ngat dong.
  const n = Number(String(price).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return undefined

  // Giu 2 chu so thap phan chi khi thuc su co phan thap phan — "$399" doc de hon
  // "$399.00", con "$28.99" thi khong duoc lam tron.
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2)

  // ⚠️ KHONG mac dinh thanh USD khi trang khong khai tien te. Du an co deal ban
  // bang IDR (deal #1016: Rp4.961.899), nen doan "$" la gan sai don vi tien te —
  // mot con so gia sai tren moi bai dang. Khong biet thi tra undefined de nguoi
  // van hanh tu nhap, giong nguyen tac khong doan gia goc.
  if (!currency) return undefined

  const code = currency.toUpperCase()
  // Biet ma nhung khong biet ky hieu thi ghi ma ra truoc, van tot hon doan "$".
  return SYMBOL[code] ? `${SYMBOL[code]}${amount}` : `${code} ${amount}`
}
