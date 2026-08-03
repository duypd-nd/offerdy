/**
 * Noi mot deal voi store tuong ung QUA DOMAIN cua `dealUrl`.
 *
 * Vi sao khong dung mot field reference cho nguoi van hanh chon: deal duoc nhap
 * lien tuc va viec chon store cho tung deal la mot buoc tay nua se bi bo qua.
 * Domain thi da nam san trong `dealUrl` — deal tro toi kyokuknives.com thi chinh
 * la store Kyokuknives, khong can ai khai bao. Suy ra duoc mot cach xac dinh thi
 * dung suy ra.
 *
 * Muc dich: neu store do dang co ma coupon that, hien ma len deal. Ma coupon la
 * duong doanh thu manh nhat cho Instagram/TikTok — caption o hai noi do khong
 * cho link bam duoc, nhung MA la chu, va GoAffPro ghi nhan don qua CA MA nen
 * khach dung ma la don ve minh ke ca khi ho khong bam link nao.
 */

import { applyTrackingParams } from '@/lib/affiliateUrl'

export type StoreHostRow = {
  slug: string
  name: string
  website?: string
  affiliateLink?: string
  /** Ma coupon noi bat cua store (null neu store khong co ma nao). */
  couponCode?: string
  /** Cau mo ta uu dai di kem ma, de hien "Giam 15% toan don" thay vi chi ma tran. */
  couponOfferText?: string
  /**
   * Slug danh muc cua store (vi du "beauty"). Deal cua mot shop nail thi thuoc
   * Beauty — day la phan loai NGUOI VAN HANH da lam san cho ca 85 store, dung lai
   * thi khong phai doan tu ten san pham.
   */
  category?: string
}

/** Host de so sanh: bo `www.`, ha chu thuong. `null` neu khong phai URL http(s). */
export function hostKey(raw?: string): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Tim store khop voi mot URL. So voi CA `website` lan `affiliateLink` cua store:
 * hai field nay khong luon cung host (co store dung `www.` o mot ben, hoac link
 * affiliate tro qua domain phu).
 *
 * Tra ve `null` khi khong khop — im lang la dung. Doan bua ra mot store se hien
 * ma coupon cua SHOP KHAC len deal, tuc dua khach di nhap mot ma khong bao gio
 * dung duoc.
 */
export function matchStoreByUrl(url: string | undefined, stores: StoreHostRow[]): StoreHostRow | null {
  const target = hostKey(url)
  if (!target) return null
  for (const store of stores) {
    if (hostKey(store.website) === target) return store
    if (hostKey(store.affiliateLink) === target) return store
  }
  return null
}

/**
 * Gan tham so tiep thi cua shop vao URL cua deal.
 *
 * Nguoi van hanh dan link san pham TRAN (copy thang tu shop); code tim store theo
 * domain roi chep tham so ref tu `store.affiliateLink` sang. Khong khop store nao
 * -> tra ve nguyen ban, khong bia ra ma.
 *
 * ⚠️ Gan luc RENDER, khong ghi nguoc vao Sanity. Ly do giong ben offer
 * (`offer.productUrl`): `dealUrl` giu sach thi khi shop doi ma ref, sua MOT cho o
 * store la moi deal cua shop do dung theo — con neu nuong ma vao tung dealUrl thi
 * phai sua tay tung deal, va nhung deal bo sot se am tham mat hoa hong.
 */
export function applyStoreRefToDealUrl(
  dealUrl: string | undefined,
  stores: StoreHostRow[]
): string | undefined {
  return resolveDealLink(dealUrl, stores).dealUrl
}

/** `&amp;` -> `&`: href trong HTML co the da duoc escape, ma `&amp;utm_source`
 *  parse ra mot tham so ten "amp;utm_source" — sai ngay tu buoc doc. */
function decodeHtmlAttr(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function encodeHtmlAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Gan tham so tiep thi vao MOI `<a href>` trong mot doan HTML da luu san.
 *
 * Vi sao can rieng ham nay: noi dung bai review duoc sinh MOT LAN roi luu thang
 * vao Sanity, nen moi link nam trong do la anh chup cua link luc viet bai. Bai
 * viet khi shop chua duoc khai bao (hoac o "Link Affiliate" con trong) co nut
 * "Check the best price" giua bai tro ra merchant TRAN — trong khi nut CTA dau
 * trang, vi duoc gan luc render, van co ref. Mot bai, hai so phan, va cai mat
 * hoa hong lai la cai nam ngay duoi phan Pros & Cons noi nguoi ta bam nhieu nhat.
 *
 * Gan luc RENDER giong `applyStoreRefToDealUrl` (xem ly do o do): sua ma ref o
 * store la ca kho bai cu di theo, khong phai sinh lai noi dung tung bai.
 */
export function applyStoreRefToHtmlLinks(
  html: string | undefined,
  stores: StoreHostRow[]
): string | undefined {
  if (!html) return html
  // Chi dung `href` cua the <a>: `src` cua <img> tro toi CDN anh, gan ref vao do
  // vua vo nghia vua co the lam hong URL anh.
  return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (whole, prefix: string, quote: string, raw: string) => {
    const href = decodeHtmlAttr(raw)
    const withRef = applyStoreRefToDealUrl(href, stores)
    if (!withRef || withRef === href) return whole
    return `${prefix}${quote}${encodeHtmlAttr(withRef)}${quote}`
  })
}

/**
 * Mot lan khop domain, tra ve CA HAI thu suy ra duoc tu do: URL da gan tham so
 * tiep thi, va TEN SHOP.
 *
 * Ten shop dung de dien `deal.store` khi truong do de trong — 22/22 deal dang
 * trong, nen the deal / trang deal / anh OG / `seller` trong JSON-LD khong he noi
 * san pham ban o dau. Thong tin do da nam san trong domain, khong can ai go tay.
 * ⚠️ Chi dien khi TRONG, khong bao gio ghi de thu nguoi van hanh da go.
 */
export function resolveDealLink(
  dealUrl: string | undefined,
  stores: StoreHostRow[]
): { dealUrl?: string; storeName?: string; storeSlug?: string } {
  if (!dealUrl) return { dealUrl }
  const store = matchStoreByUrl(dealUrl, stores)
  if (!store) return { dealUrl }
  return {
    dealUrl: applyTrackingParams(dealUrl, store),
    storeName: store.name,
    // Slug de trang deal link duoc sang /stores/<slug>: khach dang xem mot san pham
    // thi trang store la noi co TAT CA ma cua shop do.
    storeSlug: store.slug,
  }
}

export type DealCoupon = {
  code: string
  storeName: string
  storeSlug: string
  offerText?: string
}

/** Ma coupon de hien tren deal, hoac null neu khong xac dinh duoc. */
export function couponForDealUrl(
  dealUrl: string | undefined,
  stores: StoreHostRow[]
): DealCoupon | null {
  const store = matchStoreByUrl(dealUrl, stores)
  if (!store?.couponCode) return null
  return {
    code: store.couponCode,
    storeName: store.name,
    storeSlug: store.slug,
    offerText: store.couponOfferText,
  }
}
