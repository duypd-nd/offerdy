export function dealDiscountLabel(deal: {
  discount: number
  discountByAmount?: boolean
  priceOrig?: string
  priceSale?: string
}): string {
  if (deal.discountByAmount && deal.priceOrig && deal.priceSale) {
    const orig = parseFloat(deal.priceOrig.replace(/[^0-9.]/g, ''))
    const sale = parseFloat(deal.priceSale.replace(/[^0-9.]/g, ''))
    if (orig && sale && orig > sale) {
      const currency = deal.priceOrig.match(/^[^0-9]+/)?.[0] ?? '$'
      return `${currency}${Math.round(orig - sale)}`
    }
  }
  return `${deal.discount}%`
}
