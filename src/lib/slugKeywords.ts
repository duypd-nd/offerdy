/**
 * Rut tu khoa tim kiem tu mot duong dan 404.
 *
 * VI SAO CAN: do ngay 2026-08-03, **24 trong 28 luot bam tu Google roi vao trang
 * 404** — cac URL store/review da bi xoa nhung Google con xep hang nhieu tuan.
 * Nguoi do vua go mot thu rat cu the ("pollo ai coupon") va bam vao; tra ho mot
 * trang "Page Not Found" voi hai nut chung chung la vut di gan het luong khach
 * tu nhien it oi ma site co.
 *
 * Khong the chuyen huong 301 sang trang khac: noi dung bi xoa CO CHU DICH nen
 * khong co trang tuong duong, va Google coi chuyen huong kieu do la soft-404 —
 * mat thu hang ma con bi danh gia xau. Giu 404 la dung. Nhung trang 404 thi co
 * the goi y thu con song.
 *
 * `fuzzyMatch` trong `src/lib/fuzzy.ts` so khop theo TUNG TU (mot truy van nhieu
 * tu chi khop khi trung nguyen van), nen khong the nem ca slug vao tim. Ham nay
 * tra ve cac tu rieng le, da xep theo do dac trung, de noi goi thu lan luot.
 */

/**
 * Tu bo di: vua la tu noi chung, vua la tu chung cua nganh (review/coupon/deal).
 * Giu lai chung se cho ra ket qua "moi trang deu khop" — vo dung y het khong khop.
 */
const STOPWORDS = new Set([
  'review', 'reviews', 'best', 'top', 'the', 'a', 'an', 'and', 'or', 'for', 'of',
  'to', 'in', 'on', 'at', 'with', 'vs', 'versus', 'coupon', 'coupons', 'code',
  'codes', 'deal', 'deals', 'discount', 'discounts', 'promo', 'sale', 'off',
  'store', 'stores', 'shop', 'shops', 'guide', 'guides', 'tips', 'how', 'what',
  'why', 'is', 'are', 'was', 'were', 'be', 'more', 'new', 'buy', 'price',
  'prices', 'cheap', 'online', 'free', 'site', 'page', 'blog', 'post', 'article',
])

/** Doan duong dan la loai noi dung, khong phai ten thu gi. */
const SEGMENTS = new Set(['stores', 'reviews', 'deals', 'blog', 'posts', 'categories', 'coupon-codes', 'tips-guides', 'comparisons'])

/**
 * Tu khoa rut ra tu duong dan, tu DAC TRUNG NHAT tro xuong.
 *
 * Xep hang theo do dai giam dan chu khong theo thu tu xuat hien: trong
 * `beyond-marina-review-2026-best-inflatable-kayaks`, tu dang tim la "inflatable"
 * va "marina", con nhung tu ngan dau chuoi thuong la tu chung.
 */
export function slugKeywords(pathname: string, limit = 3): string[] {
  const parts = pathname.split('/').filter(Boolean)
  // Bo doan dau neu no la ten loai noi dung — "stores" khong phai thu can tim
  const meaningful = parts.filter(p => !SEGMENTS.has(p))
  if (meaningful.length === 0) return []

  const words = meaningful
    .join('-')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    // Nam (2024-2039) va so don le khong giup tim gi
    .filter(w => !/^\d+$/.test(w))
    .filter(w => w.length >= 3)
    .filter(w => !STOPWORDS.has(w))

  // Bo trung ma VAN giu thu tu xuat hien dau tien, roi moi xep theo do dai
  const seen = new Set<string>()
  const unique: string[] = []
  for (const w of words) {
    if (seen.has(w)) continue
    seen.add(w)
    unique.push(w)
  }

  return unique.sort((a, b) => b.length - a.length).slice(0, limit)
}

/**
 * Ket qua co that su lien quan den tu khoa khong?
 *
 * `/api/search-suggest` dung `fuzzyMatch`, va ham do coi BAT KY chuoi con nao la
 * khop — hop ly khi nguoi dung dang GO DO tung ky tu, nhung sai han o day. Ca
 * that: `/stores/pollo-ai` duoc goi y "Apollo Moda", chi vi "apollo moda" chua
 * chuoi "pollo". Mot goi y sai duoc trinh bay day tu tin con te hon la khong
 * goi y gi.
 *
 * Nen o day siet lai: phai khop tu DAU MOT TU. "apollo" khong bat dau bang
 * "pollo" -> loai; "audio" khop "/stores/epz-audio" -> giu.
 */
export function matchesKeyword(name: string, keyword: string): boolean {
  const k = keyword.toLowerCase().trim()
  if (!k) return false
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some(word => word.startsWith(k) || k.startsWith(word) && word.length >= 4)
}

/**
 * Nhan doc duoc cho nguoi dung: "Pollo Ai" tu `/stores/pollo-ai`.
 * Giu NGUYEN thu tu goc (khong xep lai nhu tren) va giu ca tu chung, vi day la
 * de HIEN THI chu khong phai de tim.
 */
export function slugLabel(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  const last = parts.filter(p => !SEGMENTS.has(p)).pop()
  if (!last) return ''
  return last
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 6)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
