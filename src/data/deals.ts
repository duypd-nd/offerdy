import type { SearchItem } from './stores'

export type Deal = {
  id: string
  title: string
  store?: string
  emoji?: string
  imgClass?: string
  imageUrl?: string
  priceSale: string
  priceOrig: string
  discount: number
  discountByAmount?: boolean
  verified?: boolean
  dealUrl?: string
  isExpiring?: boolean
  slug?: string
  /** Tham chieu toi category doc. Undefined = deal chua duoc phan loai —
   *  van hien o tab "All" tren /deals, chi khong loc rieng duoc. */
  category?: { name: string; emoji?: string; slug: string }
}

export type ExpiringDeal = {
  id: string
  name: string
  price: string
  emoji: string
  expiresAt: string
  imageUrl?: string
}

export const deals: Deal[] = [
  { id: '1', title: 'AirPods Pro 2nd Gen with USB-C Charging Case', store: 'Apple · Best Buy', emoji: '🎧', imgClass: 'di-tech', priceSale: '$189', priceOrig: '$249', discount: 24 },
  { id: '2', title: 'LG 55" OLED C3 4K Smart TV — 2025 Model', store: 'LG · Amazon', emoji: '📺', imgClass: 'di-tech', priceSale: '$999', priceOrig: '$1,299', discount: 23 },
  { id: '3', title: 'Dyson V15 Detect Absolute Cordless Vacuum', store: 'Dyson · dyson.com', emoji: '🧹', imgClass: 'di-home', priceSale: '$599', priceOrig: '$749', discount: 20 },
  { id: '4', title: 'Nike Air Max 90 — Full Collection Sale', store: 'Nike · nike.com', emoji: '👟', imgClass: 'di-fashion', priceSale: '$84', priceOrig: '$120', discount: 30 },
  { id: '5', title: 'Sony ZV-E10 Mirrorless Camera + 16-50mm Lens Kit', store: 'Sony · B&H Photo', emoji: '📷', imgClass: 'di-tech', priceSale: '$548', priceOrig: '$668', discount: 18 },
  { id: '6', title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker 8qt', store: 'Instant Pot · Amazon', emoji: '🍲', imgClass: 'di-home', priceSale: '$65', priceOrig: '$99', discount: 35 },
  { id: '7', title: 'Kindle Paperwhite 16GB Signature Edition (2025)', store: 'Amazon · Kindle', emoji: '📖', imgClass: 'di-tech', priceSale: '$139', priceOrig: '$179', discount: 22 },
  { id: '8', title: 'YSL Libre Eau de Parfum 90ml + Gift Set', store: 'YSL · Sephora', emoji: '💄', imgClass: 'di-beauty', priceSale: '$112', priceOrig: '$149', discount: 25 },
]

const _h = (h: number) => new Date(Date.now() + h * 3600 * 1000).toISOString()
export const expiringDeals: ExpiringDeal[] = [
  { id: 'e1', name: 'AirPods Pro 2nd Gen', price: '$189 · was $249', emoji: '🎧', expiresAt: _h(2.5) },
  { id: 'e2', name: 'LG OLED 55" 4K TV', price: '$999 · was $1,299', emoji: '📺', expiresAt: _h(4) },
  { id: 'e3', name: 'Nike Air Max 90 Sale', price: '$84 · was $120', emoji: '👟', expiresAt: _h(1) },
  { id: 'e4', name: 'MacBook Air M3 13"', price: '$949 · was $1,099', emoji: '💻', expiresAt: _h(6) },
  { id: 'e5', name: 'Instant Pot Duo 8qt', price: '$65 · was $99', emoji: '🍲', expiresAt: _h(1.5) },
]

export const searchableDeals: SearchItem[] = [
  { name: 'AirPods Pro 2nd Gen', sub: '24% off · $189', icon: '🎧' },
  { name: 'LG OLED 55" TV', sub: '23% off · $999', icon: '📺' },
  { name: 'Dyson V15 Vacuum', sub: '20% off · $599', icon: '🧹' },
  { name: 'Nike Air Max 90', sub: '30% off · $84', icon: '👟' },
  { name: 'Sony ZV-E10 Camera', sub: '18% off · $548', icon: '📷' },
  { name: 'Instant Pot Duo 8qt', sub: '35% off · $65', icon: '🍲' },
  { name: 'Kindle Paperwhite', sub: '22% off · $139', icon: '📖' },
  { name: 'YSL Libre Perfume 90ml', sub: '25% off · $112', icon: '💄' },
  { name: 'MacBook Air M3 13"', sub: '14% off · $949', icon: '💻' },
  { name: 'iPhone 16 Pro Max', sub: '10% off · $899', icon: '📱' },
  { name: 'Samsung Galaxy S25', sub: '19% off · $649', icon: '📱' },
  { name: 'Apple Watch Series 10', sub: '16% off · $337', icon: '⌚' },
]
