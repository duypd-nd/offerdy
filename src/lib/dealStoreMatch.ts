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
): { dealUrl?: string; storeName?: string } {
  if (!dealUrl) return { dealUrl }
  const store = matchStoreByUrl(dealUrl, stores)
  if (!store) return { dealUrl }
  return { dealUrl: applyTrackingParams(dealUrl, store), storeName: store.name }
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
