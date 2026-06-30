import type { SearchItem } from './stores'

export type Category = {
  id: string
  name: string
  emoji: string
  count: string
  colorClass: string
  slug?: string
  description?: string
}

export const categories: Category[] = [
  { id: 'tech', slug: 'tech', name: 'Tech & Gadgets', emoji: '💻', count: '4,820 deals', colorClass: 'ci-tech', description: 'The best deals on laptops, phones, tablets, and smart home devices.' },
  { id: 'fashion', slug: 'fashion', name: 'Fashion', emoji: '👗', count: '2,340 deals', colorClass: 'ci-fashion', description: 'Clothing, shoes, and accessories from top brands at discounted prices.' },
  { id: 'beauty', slug: 'beauty', name: 'Beauty', emoji: '💄', count: '1,680 deals', colorClass: 'ci-beauty', description: 'Skincare, makeup, and health products from verified sellers.' },
  { id: 'home', slug: 'home', name: 'Home & Garden', emoji: '🏠', count: '980 deals', colorClass: 'ci-home', description: 'Furniture, appliances, and garden essentials at the best prices.' },
  { id: 'food', slug: 'food', name: 'Food & Health', emoji: '🥗', count: '560 deals', colorClass: 'ci-food', description: 'Groceries, supplements, and meal kits with verified coupons.' },
  { id: 'travel', slug: 'travel', name: 'Travel', emoji: '✈️', count: '430 deals', colorClass: 'ci-travel', description: 'Hotels, flights, and travel gear deals — all verified before going live.' },
  { id: 'ai', slug: 'ai', name: 'AI Tools', emoji: '🤖', count: '210 deals', colorClass: 'ci-ai', description: 'Discounts on AI software, productivity tools, and SaaS subscriptions.' },
  { id: 'sports', slug: 'sports', name: 'Sports', emoji: '🏋️', count: '720 deals', colorClass: 'ci-sports', description: 'Gear, apparel, and equipment for every sport and fitness level.' },
  { id: 'kids', slug: 'kids', name: 'Kids & Baby', emoji: '👶', count: '390 deals', colorClass: 'ci-kids', description: 'Toys, clothing, and essentials for babies and children.' },
]

export const searchableCategories: SearchItem[] = categories.map(c => ({
  name: c.name,
  sub: c.count,
  icon: c.emoji,
}))
