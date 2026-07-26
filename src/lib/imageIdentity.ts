/**
 * Nhan dang anh TRUNG NHAU du URL khac nhau.
 *
 * Ly do ton tai: mot trang san pham thuong tro cung MOT tam anh qua nhieu URL khac
 * nhau, va neu chi `new Set(urls)` thi nguoi van hanh nhan duoc 3 o tick trong y het
 * nhau. Do that tren cycleaddons.com (2026-07-26), 3 "anh" tra ve la:
 *
 *   https://cycleaddons.com/wp-content/uploads/2026/07/b9f076ad-....jpg
 *   https://i0.wp.com/cycleaddons.com/wp-content/uploads/2026/07/b9f076ad-....jpg
 *   https://i0.wp.com/cycleaddons.com/.../b9f076ad-....jpg?fit=1024%2C1024&ssl=1
 *
 * Cung mot tam: khac host (CDN Jetpack), khac tham so kich thuoc.
 */

/** CDN anh chen ten mien that vao dau duong dan (Jetpack: i0/i1/i2.wp.com/<host>/...). */
const CDN_PREFIX = /^(?:i\d\.wp\.com|images\.weserv\.nl|wsrv\.nl)\//i

/**
 * Hau to kich thuoc do CMS sinh ra, KHONG phai phan cua ten anh:
 * WordPress `-1024x1024`, Shopify `_1024x1024` / `_500x` / `_grande` / `_large`.
 * ⚠️ Chi cat khi nam NGAY TRUOC duoi file, de khong pha ten that nhu
 * "iphone-15-pro_2x" hay "kem-duong-50g".
 */
const SIZE_SUFFIX = /[-_](?:\d{2,4}x\d{2,4}|\d{2,4}x|x\d{2,4}|grande|large|medium|small|thumb|compact)(?=\.[a-z0-9]+$)/i

/**
 * Khoa dinh danh cua mot anh. Hai URL cho cung khoa = cung mot tam anh.
 *
 * Chi lay TEN FILE (khong lay ca duong dan): CDN va CMS doi thu muc lien tuc, con
 * ten file thi giu nguyen. Voi thu vien anh cua mot san pham, ten file la dinh danh
 * du dung — trung ten o hai thu muc khac nhau la truong hop rat hiem, va hau qua
 * chi la bo qua mot anh trong o chon.
 */
export function imageKey(rawUrl: string): string {
  let value = rawUrl.trim()
  try {
    const u = new URL(value)
    // Bo tham so: `?v=176463`, `?fit=1600,1600&ssl=1`, `?width=500` — cung mot anh.
    value = u.host.replace(/^www\./, '') + u.pathname
  } catch {
    // Khong phai URL tuyet doi: bo phan query bang tay
    value = value.split('?')[0]
  }
  value = value.replace(CDN_PREFIX, '')
  const file = value.split('/').filter(Boolean).pop() ?? value
  return file.replace(SIZE_SUFFIX, '').toLowerCase()
}

/**
 * Bo anh trung, GIU THU TU dau vao.
 *
 * Thu tu quan trong: nguoi goi dat anh tu thu vien san pham (dung, day du) len
 * TRUOC anh tu og:image/JSON-LD (thuong la anh dai dien duy nhat), nen ban giu lai
 * la ban tot hon.
 */
export function dedupeImageUrls(urls: (string | undefined)[], limit = 8): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const value = url?.trim()
    if (!value) continue
    const key = imageKey(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}
