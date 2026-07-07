export type SeoIssueType =
  | 'missing_meta_title' | 'missing_meta_description' | 'duplicate_meta_title' | 'duplicate_meta_description'
  | 'missing_faq' | 'missing_image' | 'thin_excerpt' | 'missing_excerpt'

export type SeoIssue = {
  type: SeoIssueType
  severity: 'high' | 'medium' | 'low'
  entityType: 'store' | 'deal' | 'post' | 'review'
  entityId: string
  entityName: string
  entitySlug?: string
  adminHref: string
}

const LABEL: Record<SeoIssueType, string> = {
  missing_meta_title: 'Thiếu Meta Title',
  missing_meta_description: 'Thiếu Meta Description',
  duplicate_meta_title: 'Trùng Meta Title với entity khác',
  duplicate_meta_description: 'Trùng Meta Description với entity khác',
  missing_faq: 'Thiếu FAQ (mất cơ hội structured data)',
  missing_image: 'Thiếu ảnh đại diện',
  thin_excerpt: 'Excerpt quá ngắn (<50 ký tự)',
  missing_excerpt: 'Thiếu Excerpt',
}

export function issueLabel(type: SeoIssueType): string {
  return LABEL[type]
}

export type StoreSeoInput = { id: string; name: string; slug?: string; metaTitle?: string; metaDescription?: string; faqCount: number; hasImage: boolean }
export type DealSeoInput = { id: string; title: string; slug?: string; metaTitle?: string; metaDescription?: string; faqCount: number; hasImage: boolean }
export type PostSeoInput = { id: string; title: string; slug?: string; excerpt?: string; hasImage: boolean }
export type ReviewSeoInput = { id: string; title: string; slug?: string; excerpt?: string; hasImage: boolean }

function findDuplicates<T extends { id: string; value: string }>(items: T[]): Map<string, T[]> {
  const byValue = new Map<string, T[]>()
  for (const item of items) {
    if (!item.value) continue
    const key = item.value.trim().toLowerCase()
    if (!byValue.has(key)) byValue.set(key, [])
    byValue.get(key)!.push(item)
  }
  const dupes = new Map<string, T[]>()
  for (const [key, group] of byValue) {
    if (group.length > 1) dupes.set(key, group)
  }
  return dupes
}

export function auditStores(stores: StoreSeoInput[]): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const s of stores) {
    const adminHref = '/admin/stores'
    if (!s.metaTitle) issues.push({ type: 'missing_meta_title', severity: 'high', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (!s.metaDescription) issues.push({ type: 'missing_meta_description', severity: 'high', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (s.faqCount === 0) issues.push({ type: 'missing_faq', severity: 'medium', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (!s.hasImage) issues.push({ type: 'missing_image', severity: 'medium', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
  }

  const titleDupes = findDuplicates(stores.filter(s => s.metaTitle).map(s => ({ id: s.id, value: s.metaTitle!, s })))
  for (const group of titleDupes.values()) {
    for (const { s } of group) issues.push({ type: 'duplicate_meta_title', severity: 'low', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref: '/admin/stores' })
  }
  const descDupes = findDuplicates(stores.filter(s => s.metaDescription).map(s => ({ id: s.id, value: s.metaDescription!, s })))
  for (const group of descDupes.values()) {
    for (const { s } of group) issues.push({ type: 'duplicate_meta_description', severity: 'low', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref: '/admin/stores' })
  }

  return issues
}

export function auditDeals(deals: DealSeoInput[]): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const d of deals) {
    const adminHref = '/admin/deals'
    if (!d.metaTitle) issues.push({ type: 'missing_meta_title', severity: 'medium', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (!d.metaDescription) issues.push({ type: 'missing_meta_description', severity: 'medium', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (d.faqCount === 0) issues.push({ type: 'missing_faq', severity: 'low', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (!d.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
  }
  return issues
}

export function auditPosts(posts: PostSeoInput[]): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const p of posts) {
    const adminHref = '/admin/posts'
    if (!p.excerpt) issues.push({ type: 'missing_excerpt', severity: 'medium', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
    else if (p.excerpt.length < 50) issues.push({ type: 'thin_excerpt', severity: 'low', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
    if (!p.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
  }
  return issues
}

export function auditReviews(reviews: ReviewSeoInput[]): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const r of reviews) {
    const adminHref = '/admin/reviews'
    if (!r.excerpt) issues.push({ type: 'missing_excerpt', severity: 'medium', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
    else if (r.excerpt.length < 50) issues.push({ type: 'thin_excerpt', severity: 'low', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
    if (!r.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
  }
  return issues
}
