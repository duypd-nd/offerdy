export type Post = {
  id: string
  slug: string
  title: string
  excerpt: string
  category: 'Tips & Guides' | 'Comparison' | 'Store Guide' | 'Deals Roundup' | 'News'
  author: string
  date: string
  coverEmoji: string
  coverBg: string
  readTime: number
  imageUrl?: string
}

export const posts: Post[] = [
  {
    id: '1',
    slug: 'how-to-stack-coupons-for-maximum-savings',
    title: '10 Tricks to Stack Coupons and Save Up to 70% on Every Purchase',
    excerpt: 'Most shoppers leave money on the table by using just one coupon at a time. Here\'s how to combine store sales, cashback, and promo codes to hit savings you didn\'t think were possible.',
    category: 'Tips & Guides',
    author: 'Offerdy Team',
    date: 'Jun 20, 2026',
    coverEmoji: '🎯',
    coverBg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)',
    readTime: 6,
  },
  {
    id: '2',
    slug: 'amazon-prime-day-2026-guide',
    title: 'Amazon Prime Day 2026: What to Expect and How to Win It',
    excerpt: 'Prime Day is the biggest shopping event of the year — but only if you know how to play it. We break down the strategy: what to buy, what to skip, and how to find deals before they sell out.',
    category: 'Deals Roundup',
    author: 'Offerdy Team',
    date: 'Jun 18, 2026',
    coverEmoji: '📦',
    coverBg: 'linear-gradient(135deg,#FFF9C4,#FFD600)',
    readTime: 8,
  },
  {
    id: '3',
    slug: 'how-to-spot-fake-discounts',
    title: 'How to Spot Fake Discounts: 7 Red Flags Every Shopper Should Know',
    excerpt: "That \"80% off\" flash sale might not be what it seems. Retailers inflate original prices to make discounts look bigger. Here's how we verify deals — and how you can protect yourself.",
    category: 'Tips & Guides',
    author: 'Offerdy Team',
    date: 'Jun 15, 2026',
    coverEmoji: '🔍',
    coverBg: 'linear-gradient(135deg,#FFF1F2,#FECDD3)',
    readTime: 5,
  },
  {
    id: '4',
    slug: 'best-time-to-buy-seasonal-guide',
    title: 'Best Time to Buy Anything: The Complete 2026 Seasonal Deals Calendar',
    excerpt: 'TVs in January. Laptops in August. Air conditioners in October. There\'s a right time to buy almost anything — and buying at the wrong time can cost you hundreds.',
    category: 'Tips & Guides',
    author: 'Offerdy Team',
    date: 'Jun 12, 2026',
    coverEmoji: '📅',
    coverBg: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)',
    readTime: 7,
  },
  {
    id: '5',
    slug: 'shopee-vs-lazada-which-is-better',
    title: 'Shopee vs Lazada 2026: Which Platform Has Better Deals?',
    excerpt: "Southeast Asia's two e-commerce giants are locked in a price war — and you're the winner. We compared prices, shipping speeds, and seller reliability across 50 products.",
    category: 'Store Guide',
    author: 'Offerdy Team',
    date: 'Jun 8, 2026',
    coverEmoji: '🛒',
    coverBg: 'linear-gradient(135deg,#EEF2FF,#C7D2FE)',
    readTime: 6,
  },
  {
    id: '6',
    slug: 'browser-extensions-for-automatic-coupons',
    title: '6 Browser Extensions That Find Coupon Codes Automatically at Checkout',
    excerpt: 'Install these once and they run silently in the background — testing every available coupon code while you shop. We ranked them by how much they actually saved us.',
    category: 'Tips & Guides',
    author: 'Offerdy Team',
    date: 'Jun 5, 2026',
    coverEmoji: '🧩',
    coverBg: 'linear-gradient(135deg,#FAF5FF,#E9D5FF)',
    readTime: 4,
  },
]
