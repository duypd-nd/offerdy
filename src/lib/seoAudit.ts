export type SeoIssueType =
  | 'missing_meta_title' | 'missing_meta_description' | 'duplicate_meta_title' | 'duplicate_meta_description'
  | 'missing_faq' | 'missing_image' | 'thin_excerpt' | 'missing_excerpt'
  | 'long_meta_title'

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
  long_meta_title: 'Tiêu đề quá dài — Google cắt mất phần cuối',
}

/**
 * Google chi hien khoang 60 ky tu tieu de (~580px) roi cat bang dau "…".
 *
 * Do that ngay 2026-08-03 tren cac trang DANG xep hang: **24/28 vuot nguong**.
 * Nang nhat la /reviews/flashfish-... — 299 luot hien o vi tri 8.2 va **0 click**,
 * tieu de 136 ky tu, nguoi tim kiem chi doc duoc
 * "FlashFish Portable Power Station Review 2026: Compact Bac…".
 *
 * ⚠️ Phai tinh CA phan duoi cua `titleTemplate`. Mau dang dung
 * `%s | Offerdy - Real Deals. Verified` gan them **33 ky tu** vao moi trang —
 * hon mot nua ngan sach hien thi, truoc khi trang do kip noi gi ve minh. Kiem
 * moi `metaTitle.length` se bo sot dung cai nguyen nhan lon nhat.
 */
export const TITLE_LIMIT = 60

/** So ky tu co dinh ma `titleTemplate` them vao moi tieu de ("%s | Offerdy" -> 10). */
export function titleSuffixLength(titleTemplate?: string): number {
  if (!titleTemplate) return 0
  return titleTemplate.replace('%s', '').length
}

function isTitleTooLong(title: string | undefined, suffixLength: number): boolean {
  if (!title) return false
  return title.trim().length + suffixLength > TITLE_LIMIT
}

export function issueLabel(type: SeoIssueType): string {
  return LABEL[type]
}

export type StoreSeoInput = { id: string; name: string; slug?: string; metaTitle?: string; metaDescription?: string; faqCount: number; hasImage: boolean }
export type DealSeoInput = { id: string; title: string; slug?: string; metaTitle?: string; metaDescription?: string; faqCount: number; hasImage: boolean }
// `metaTitle` co mat vi trang bai viet/review dung `metaTitle ?? title` lam
// <title> (xem generateMetadata cua /reviews/[slug] va /blog/[slug]). Kiem `title`
// khong thoi se bao dong nham cho bai da co metaTitle ngan dung chuan.
export type PostSeoInput = { id: string; title: string; slug?: string; excerpt?: string; metaTitle?: string; hasImage: boolean }
export type ReviewSeoInput = { id: string; title: string; slug?: string; excerpt?: string; metaTitle?: string; hasImage: boolean }

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

// Link "Sua" phai mo THANG ban ghi co van de, khong phai ca danh sach. Ca 4 trang
// admin deu loc theo `?q=`, va slug la khoa duy nhat nen dua slug vao la ra dung
// mot dong; ban ghi thieu slug thi lui ve dung ten.
function adminHrefFor(base: string, slugOrName?: string): string {
  if (!slugOrName) return base
  return `${base}?q=${encodeURIComponent(slugOrName)}`
}

export function auditStores(stores: StoreSeoInput[], suffixLength = 0): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const s of stores) {
    const adminHref = adminHrefFor('/admin/stores', s.slug || s.name)
    if (!s.metaTitle) issues.push({ type: 'missing_meta_title', severity: 'high', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (!s.metaDescription) issues.push({ type: 'missing_meta_description', severity: 'high', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (isTitleTooLong(s.metaTitle || s.name, suffixLength)) issues.push({ type: 'long_meta_title', severity: 'medium', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (s.faqCount === 0) issues.push({ type: 'missing_faq', severity: 'medium', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
    if (!s.hasImage) issues.push({ type: 'missing_image', severity: 'medium', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref })
  }

  const titleDupes = findDuplicates(stores.filter(s => s.metaTitle).map(s => ({ id: s.id, value: s.metaTitle!, s })))
  for (const group of titleDupes.values()) {
    for (const { s } of group) issues.push({ type: 'duplicate_meta_title', severity: 'low', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref: adminHrefFor('/admin/stores', s.slug || s.name) })
  }
  const descDupes = findDuplicates(stores.filter(s => s.metaDescription).map(s => ({ id: s.id, value: s.metaDescription!, s })))
  for (const group of descDupes.values()) {
    for (const { s } of group) issues.push({ type: 'duplicate_meta_description', severity: 'low', entityType: 'store', entityId: s.id, entityName: s.name, entitySlug: s.slug, adminHref: adminHrefFor('/admin/stores', s.slug || s.name) })
  }

  return issues
}

export function auditDeals(deals: DealSeoInput[], suffixLength = 0): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const d of deals) {
    const adminHref = adminHrefFor('/admin/deals', d.slug || d.title)
    if (!d.metaTitle) issues.push({ type: 'missing_meta_title', severity: 'medium', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (!d.metaDescription) issues.push({ type: 'missing_meta_description', severity: 'medium', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    // Deal khong dat metaTitle thi trang dung `title` lam tieu de
    if (isTitleTooLong(d.metaTitle || d.title, suffixLength)) issues.push({ type: 'long_meta_title', severity: 'medium', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (d.faqCount === 0) issues.push({ type: 'missing_faq', severity: 'low', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
    if (!d.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'deal', entityId: d.id, entityName: d.title, entitySlug: d.slug, adminHref })
  }
  return issues
}

export function auditPosts(posts: PostSeoInput[], suffixLength = 0): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const p of posts) {
    const adminHref = adminHrefFor('/admin/posts', p.slug || p.title)
    if (!p.excerpt) issues.push({ type: 'missing_excerpt', severity: 'medium', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
    else if (p.excerpt.length < 50) issues.push({ type: 'thin_excerpt', severity: 'low', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
    if (!p.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
    if (isTitleTooLong(p.metaTitle || p.title, suffixLength)) issues.push({ type: 'long_meta_title', severity: 'medium', entityType: 'post', entityId: p.id, entityName: p.title, entitySlug: p.slug, adminHref })
  }
  return issues
}

export function auditReviews(reviews: ReviewSeoInput[], suffixLength = 0): SeoIssue[] {
  const issues: SeoIssue[] = []
  for (const r of reviews) {
    const adminHref = adminHrefFor('/admin/reviews', r.slug || r.title)
    if (!r.excerpt) issues.push({ type: 'missing_excerpt', severity: 'medium', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
    else if (r.excerpt.length < 50) issues.push({ type: 'thin_excerpt', severity: 'low', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
    if (!r.hasImage) issues.push({ type: 'missing_image', severity: 'low', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
    if (isTitleTooLong(r.metaTitle || r.title, suffixLength)) issues.push({ type: 'long_meta_title', severity: 'medium', entityType: 'review', entityId: r.id, entityName: r.title, entitySlug: r.slug, adminHref })
  }
  return issues
}
