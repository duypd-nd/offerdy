export type HealthLevel = 'Excellent' | 'Very Good' | 'Healthy' | 'Needs Improvement' | 'Poor' | 'Critical'

export type StoreHealthInput = {
  id: string
  name: string
  slug?: string
  hasImage: boolean
  hasDescription: boolean
  faqCount: number
  hasProsAndCons: boolean
  metaTitle?: string
  metaKeywords?: string
  metaDescription?: string
  updatedAt: string
  offerStats: {
    total: number
    verified: number
    linkOk: number
    linkChecked: number
  }
}

export type StoreHealth = {
  overall: number
  categories: { content: number; seo: number; affiliate: number; freshness: number }
  level: HealthLevel
  issues: string[]
}

export function levelFor(score: number): HealthLevel {
  if (score >= 95) return 'Excellent'
  if (score >= 90) return 'Very Good'
  if (score >= 80) return 'Healthy'
  if (score >= 70) return 'Needs Improvement'
  if (score >= 60) return 'Poor'
  return 'Critical'
}

export function computeStoreHealth(store: StoreHealthInput): StoreHealth {
  const issues: string[] = []

  // ── Content (40%) ──────────────────────────────────────────
  let content = 0
  if (store.hasImage) content += 25
  else issues.push('Thiếu logo')
  if (store.hasDescription) content += 25
  else issues.push('Chưa có mô tả')
  if (store.faqCount >= 3) content += 25
  else issues.push(store.faqCount > 0 ? 'FAQ dưới 3 câu' : 'Chưa có FAQ')
  if (store.hasProsAndCons) content += 25
  else issues.push('Chưa có Ưu/Nhược điểm')

  // ── SEO (20%) ──────────────────────────────────────────────
  let seo = 0
  if (store.metaTitle) seo += 34
  else issues.push('Thiếu Meta Title')
  if (store.metaKeywords) seo += 33
  else issues.push('Thiếu Meta Keywords')
  if (store.metaDescription) seo += 33
  else issues.push('Thiếu Meta Description')
  seo = Math.min(seo, 100)

  // ── Affiliate (25%) ────────────────────────────────────────
  let affiliate = 0
  const { total, verified, linkOk, linkChecked } = store.offerStats
  if (total === 0) {
    issues.push('Không có offer active nào')
  } else {
    const verifiedRatio = verified / total
    const linkRatio = linkChecked > 0 ? linkOk / linkChecked : 0.5
    affiliate = Math.min(20 + verifiedRatio * 40 + linkRatio * 40, 100)

    const unverified = total - verified
    if (unverified > 0) issues.push(`${unverified} offer chưa verified`)
    const broken = linkChecked - linkOk
    if (broken > 0) issues.push(`${broken} offer có link hỏng`)
  }

  // ── Freshness (15%) ────────────────────────────────────────
  const daysSinceUpdate = (Date.now() - new Date(store.updatedAt).getTime()) / 86_400_000
  let freshness: number
  if (daysSinceUpdate <= 30) freshness = 100
  else if (daysSinceUpdate <= 90) freshness = 70
  else if (daysSinceUpdate <= 180) freshness = 40
  else { freshness = 20; issues.push('Nội dung chưa cập nhật hơn 6 tháng') }

  const overall = Math.round(content * 0.40 + seo * 0.20 + affiliate * 0.25 + freshness * 0.15)

  return {
    overall,
    categories: { content, seo, affiliate: Math.round(affiliate), freshness },
    level: levelFor(overall),
    issues,
  }
}

export const HEALTH_LEVEL_COLOR: Record<HealthLevel, string> = {
  'Excellent': '#16A34A',
  'Very Good': '#22C55E',
  'Healthy': '#84CC16',
  'Needs Improvement': '#F59E0B',
  'Poor': '#EA580C',
  'Critical': '#DC2626',
}
