/**
 * Danh muc bai viet — MOT nguon duy nhat cho ca schema Sanity lan giao dien.
 *
 * Vi sao gom ve day: truoc 2026-08-05 danh sach nay ton tai o BON cho khac nhau —
 * `sanity/schemaTypes/post.ts` (o chon trong Studio), `BlogPageContent.tsx` (chip
 * loc + mau), va `blog/[slug]/page.tsx` (mau huy hieu). Chung da lech nhau:
 * schema co `Comparison` nhung hai cho kia thi khong, nen bai so sanh **khong co
 * chip de loc** va bi gan nham mau cua Tips. Bon cho de quen mot danh muc gio
 * con mot.
 *
 * ⚠️ Them danh muc moi thi phai co mot lop mau tuong ung trong `globals.css`
 * (`.cat-*`), khong thi huy hieu roi ve mac dinh va trong giong danh muc khac.
 */

export type PostCategory =
  | 'Tips & Guides'
  | 'Comparison'
  | 'Store Guide'
  | 'Deals Roundup'
  | 'News'

export const POST_CATEGORIES: PostCategory[] = [
  'Tips & Guides',
  'Comparison',
  'Store Guide',
  'Deals Roundup',
  'News',
]

/** Danh muc -> lop mau huy hieu. Khoa phai khop `.cat-*` trong globals.css. */
export const CAT_CLASS: Record<string, string> = {
  'Tips & Guides': 'cat-tips',
  'Comparison': 'cat-compare',
  'Store Guide': 'cat-store',
  'Deals Roundup': 'cat-roundup',
  'News': 'cat-news',
}

/** Lop mau cho mot danh muc, lui ve Tips khi gap gia tri la. */
export function catClass(category?: string): string {
  return CAT_CLASS[category ?? ''] ?? 'cat-tips'
}

/** O chon cho Sanity Studio — dung chung danh sach voi giao dien. */
export const POST_CATEGORY_OPTIONS = POST_CATEGORIES.map(c => ({ title: c, value: c }))
