export type DealDiscountBadge = { main: string; sub: string | null }

export function dealDiscountBadge(deal: {
  discount: number
  discountByAmount?: boolean
  priceOrig?: string
  priceSale?: string
}): DealDiscountBadge {
  if (deal.discountByAmount && deal.priceOrig && deal.priceSale) {
    const orig = parseFloat(deal.priceOrig.replace(/[^0-9.]/g, ''))
    const sale = parseFloat(deal.priceSale.replace(/[^0-9.]/g, ''))
    if (orig && sale && orig > sale) {
      const currency = deal.priceOrig.match(/^[^0-9]+/)?.[0] ?? '$'
      return { main: `Save ${currency}${Math.round(orig - sale)}`, sub: null }
    }
  }
  return { main: `${deal.discount}%`, sub: 'OFF' }
}
