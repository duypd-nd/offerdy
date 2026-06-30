import type { SearchItem } from './stores'

export type Review = {
  id: string
  slug: string
  title: string
  excerpt: string
  emoji: string
  tag: 'Review' | 'Comparison'
  stars: number
  date: string
  imgBg: string
  imageUrl?: string
}

export const reviews: Review[] = [
  { id: '1', slug: 'iphone-16-pro-max-review', title: 'iPhone 16 Pro Max Review — Worth the Upgrade?', excerpt: '30 days of testing. The AI camera blew us away, but battery life still trails the best Android flagships.', emoji: '📱', tag: 'Review', stars: 5, date: 'Jun 15, 2026', imgBg: 'linear-gradient(135deg,#EEF2FF,#C7D2FE)' },
  { id: '2', slug: 'best-laptops-under-500', title: 'Best Laptops Under $500 in 2026: Tested & Ranked', excerpt: 'From MacBook Air M3 to Dell XPS 13 — we benchmarked performance, battery, and real-world use.', emoji: '💻', tag: 'Comparison', stars: 4, date: 'Jun 10, 2026', imgBg: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' },
  { id: '3', slug: 'samsung-galaxy-s25-vs-iphone-16', title: 'Samsung Galaxy S25 vs iPhone 16: Which Should You Buy?', excerpt: 'Camera, performance, battery, software — a full 2026 flagship showdown to help you spend smart.', emoji: '⚖️', tag: 'Comparison', stars: 5, date: 'Jun 5, 2026', imgBg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' },
  { id: '4', slug: 'best-wireless-earbuds-2026', title: 'Best Wireless Earbuds 2026: AirPods vs Sony vs Bose', excerpt: 'We tested ANC, call quality, and comfort over 60 hours to find the best pair for every budget.', emoji: '🎧', tag: 'Comparison', stars: 5, date: 'Jun 1, 2026', imgBg: 'linear-gradient(135deg,#FDF2F8,#FCE7F3)' },
  { id: '5', slug: 'macbook-air-m3-review', title: 'MacBook Air M3 Review: The Perfect Everyday Laptop?', excerpt: "Fanless, fast, and all-day battery — Apple's M3 chip makes the Air the default recommendation for most people.", emoji: '🖥️', tag: 'Review', stars: 5, date: 'May 28, 2026', imgBg: 'linear-gradient(135deg,#ECFDF5,#A7F3D0)' },
  { id: '6', slug: 'best-ai-tools-productivity-2026', title: 'Best AI Tools for Productivity 2026: Ranked & Priced', excerpt: 'ChatGPT, Claude, Gemini, Copilot — which AI assistant actually saves you the most time at work?', emoji: '🤖', tag: 'Comparison', stars: 4, date: 'May 22, 2026', imgBg: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)' },
  { id: '7', slug: 'best-robot-vacuums-2026', title: 'Best Robot Vacuums 2026: iRobot vs Roborock vs Ecovacs', excerpt: 'We ran 40 cleaning sessions across carpet, hardwood, and pet hair to pick the smartest robot vac.', emoji: '🧹', tag: 'Comparison', stars: 5, date: 'May 18, 2026', imgBg: 'linear-gradient(135deg,#FFF1F2,#FFE4E6)' },
  { id: '8', slug: 'nike-vs-adidas-running-shoes-2026', title: 'Nike vs Adidas Running Shoes: Which Brand Wins in 2026?', excerpt: "300+ miles across both brands' flagship runners. Here's which one holds up for daily training and race day.", emoji: '👟', tag: 'Comparison', stars: 4, date: 'May 14, 2026', imgBg: 'linear-gradient(135deg,#FFFBEB,#FDE68A)' },
]

export const searchableReviews: SearchItem[] = reviews.map(r => ({
  name: r.title,
  sub: `${r.tag} · Tech`,
  icon: r.emoji,
}))
