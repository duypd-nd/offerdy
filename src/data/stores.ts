export type StoreEvent = {
  title: string; date?: string; description?: string; discount?: number; link?: string
}

export type Store = {
  name: string; abbr: string; colorClass: string; count: string
  slug?: string; website?: string; affiliateLink?: string; category?: string
  imageUrl?: string; maxOffer?: number
  shortDescription?: string; description?: string
  events?: StoreEvent[]
  metaTitle?: string; metaKeywords?: string; metaDescription?: string
}
export type SearchItem = { name: string; sub: string; icon: string }

export const stores: Store[] = [
  { name: 'Amazon', abbr: 'Am', colorClass: 'sa-amz', count: '1,240 deals', slug: 'amazon', website: 'amazon.com' },
  { name: 'Apple', abbr: 'Ap', colorClass: 'sa-apl', count: '86 deals', slug: 'apple', website: 'apple.com' },
  { name: 'Nike', abbr: 'Nk', colorClass: 'sa-nke', count: '342 deals', slug: 'nike', website: 'nike.com' },
  { name: 'Samsung', abbr: 'Ss', colorClass: 'sa-ssn', count: '215 deals', slug: 'samsung', website: 'samsung.com' },
  { name: 'Adidas', abbr: 'Ad', colorClass: 'sa-adi', count: '278 deals', slug: 'adidas', website: 'adidas.com' },
  { name: 'Best Buy', abbr: 'BB', colorClass: 'sa-bb', count: '567 deals', slug: 'best-buy', website: 'bestbuy.com' },
  { name: 'Shopee', abbr: 'Sp', colorClass: 'sa-shp', count: '4,320 deals', slug: 'shopee', website: 'shopee.com' },
  { name: 'Lazada', abbr: 'Lz', colorClass: 'sa-lzd', count: '2,180 deals', slug: 'lazada', website: 'lazada.com' },
  { name: 'Walmart', abbr: 'Wm', colorClass: 'sa-wmt', count: '892 deals', slug: 'walmart', website: 'walmart.com' },
  { name: 'ASOS', abbr: 'AS', colorClass: 'sa-aso', count: '190 deals', slug: 'asos', website: 'asos.com' },
  { name: 'Booking', abbr: 'Bk', colorClass: 'sa-bkg', count: '430 deals', slug: 'booking', website: 'booking.com' },
  { name: 'AliExpress', abbr: 'Ae', colorClass: 'sa-ali', count: '9,800 deals', slug: 'aliexpress', website: 'aliexpress.com' },
]

export const searchableStores: SearchItem[] = [
  { name: 'Amazon', sub: '1,240 deals', icon: '🛒' },
  { name: 'Apple', sub: '86 deals', icon: '🍎' },
  { name: 'Nike', sub: '342 deals', icon: '👟' },
  { name: 'Samsung', sub: '215 deals', icon: '📱' },
  { name: 'Adidas', sub: '278 deals', icon: '👕' },
  { name: 'Best Buy', sub: '567 deals', icon: '🔌' },
  { name: 'Shopee', sub: '4,320 deals', icon: '🛍️' },
  { name: 'Lazada', sub: '2,180 deals', icon: '📦' },
  { name: 'Walmart', sub: '892 deals', icon: '🏪' },
  { name: 'ASOS', sub: '190 deals', icon: '👗' },
  { name: 'Booking.com', sub: '430 deals', icon: '🏨' },
  { name: 'AliExpress', sub: '9,800 deals', icon: '🌏' },
  { name: 'Dyson', sub: '48 deals', icon: '🌀' },
  { name: 'Sephora', sub: '230 deals', icon: '💄' },
  { name: 'Sony', sub: '120 deals', icon: '🎮' },
  { name: 'Target', sub: '680 deals', icon: '🎯' },
  { name: 'eBay', sub: '3,400 deals', icon: '🏷️' },
]
