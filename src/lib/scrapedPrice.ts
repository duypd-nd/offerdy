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

export function formatScrapedPrice(price?: string, currency?: string): string | undefined {
  if (!price) return undefined
  // Bo moi thu khong phai so/dau cham: gia co the den kem ky hieu, dau phay ngan
  // cach nghin, hoac khoang trang khong ngat dong.
  const n = Number(String(price).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return undefined

  // Giu 2 chu so thap phan chi khi thuc su co phan thap phan — "$399" doc de hon
  // "$399.00", con "$28.99" thi khong duoc lam tron.
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2)

  const code = (currency ?? 'USD').toUpperCase()
  // Khong biet ky hieu thi ghi ma tien te ra truoc, KHONG mac dinh thanh "$":
  // hien sai don vi tien te la sai thong tin gia.
  return SYMBOL[code] ? `${SYMBOL[code]}${amount}` : `${code} ${amount}`
}
