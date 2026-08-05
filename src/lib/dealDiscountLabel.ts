import { parsePriceAmount, priceSymbol, formatAmount } from './priceAmount'

export type DealDiscountBadge = { main: string; sub: string | null }

/**
 * Nhãn giảm giá in trên thẻ deal, ảnh Open Graph và caption mạng xã hội.
 *
 * ⚠️ Con số ở đây phải qua `parsePriceAmount`, không được tự bóc số. Bản cũ dùng
 * `replace(/[^0-9.]/g,'')` nên `€199,99 → €149,99` in ra **"Save €5000"** — sai gấp
 * một trăm lần, và sai ở đúng chỗ người mua nhìn thấy trước khi bấm.
 */
export function dealDiscountBadge(deal: {
  discount: number
  discountByAmount?: boolean
  priceOrig?: string
  priceSale?: string
}): DealDiscountBadge {
  if (deal.discountByAmount && deal.priceOrig && deal.priceSale) {
    const orig = parsePriceAmount(deal.priceOrig)
    const sale = parsePriceAmount(deal.priceSale)
    if (orig && sale && orig > sale) {
      // Ký hiệu lấy từ chính ô giá gốc — deal bán bằng € thì nhãn phải là €.
      return { main: `Save ${priceSymbol(deal.priceOrig)}${formatAmount(orig - sale)}`, sub: null }
    }
  }
  return { main: `${deal.discount}%`, sub: 'OFF' }
}
