/**
 * Giai URL dich cuoi cung cho mot offer.
 *
 * Boi canh: moi shop tren GoAffPro la mot chuong trinh rieng, va ma ref KHONG
 * giong nhau giua cac shop (`?ref=offerdy` o Consistentderma, `?ref=xyupasuk` o
 * Paws at Peace...). Vi vay ma ref khong bao gio duoc hardcode — no luon duoc
 * doc ra tu chinh `store.affiliateLink` cua dung shop do.
 *
 * Nguoi van hanh chi can dan URL trang san pham TRAN (copy thang tu shop), code
 * tu gan tham so tracking vao. Xem product_url trong /admin/import.
 */

/** Host de so sanh: bo `www.`, ha chu thuong. `null` neu khong phai URL http(s). */
function hostKey(raw?: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** `example.com` -> `https://example.com` (cot website trong Sanity luu ca 2 dang). */
function toAbsolute(raw?: string): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value.replace(/^\/+/, '')}`
}

export type OfferUrlInput = {
  /** URL trang san pham cu the, dang tran (khong bat buoc co ref). */
  productUrl?: string
  /** Link san co tren offer — hien tai deu trung affiliateLink cua store. */
  link?: string
  /**
   * Ket qua lan kiem tra link gan nhat (cron `link-check-nightly` va
   * `/admin/link-checker` deu kiem `coalesce(productUrl, link)`).
   */
  linkStatus?: 'unchecked' | 'ok' | 'broken' | string
}

export type StoreUrlInput = {
  /** Link affiliate cua store, vd `https://shop.com/?ref=offerdy`. */
  affiliateLink?: string
  /** Website tran cua store, dung khi store chua co link affiliate. */
  website?: string
}

/**
 * Cac tham so tracking lay tu link affiliate cua store (thuong la mot `ref`,
 * nhung khong gia dinh: shop nao them tham so khac thi mang theo het).
 */
export function trackingParams(affiliateLink?: string): [string, string][] {
  if (!affiliateLink) return []
  try {
    return [...new URL(affiliateLink.trim()).searchParams.entries()]
  } catch {
    return []
  }
}

/**
 * Gan tham so tracking cua store vao URL san pham.
 *
 * Hai quy tac co y:
 * 1. Tham so ma URL san pham DA CO thi giu nguyen — nguoi van hanh dan link day
 *    du tu cong GoAffPro van dung, code khong ghi de.
 * 2. Chi gan khi hai ben CUNG HOST. Ma ref cua shop A gan vao domain shop B
 *    khong ghi nhan duoc cho nao ca; im lang gan vao chi tao cam giac an toan
 *    gia. Truong hop do tra ve URL nguyen ban va de importer canh bao.
 */
export function applyTrackingParams(productUrl: string, store: StoreUrlInput): string {
  const params = trackingParams(store.affiliateLink)
  if (!params.length) return productUrl

  const productHost = hostKey(productUrl)
  const affiliateHost = hostKey(store.affiliateLink)
  if (!productHost || productHost !== affiliateHost) return productUrl

  try {
    const url = new URL(productUrl)
    for (const [key, value] of params) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value)
    }
    return url.toString()
  } catch {
    return productUrl
  }
}

/**
 * URL cuoi cung cho nut Get Deal / Get Code cua mot offer.
 *
 * Uu tien: trang san pham (da gan ref) > link rieng cua offer > link affiliate
 * cua store > website store. Tra ve `#` khi khong co gi — nut van render nhung
 * khong dan di dau, giong hanh vi cu cua StoreOfferList.
 */
export function resolveOfferUrl(offer: OfferUrlInput, store: StoreUrlInput): string {
  const productUrl = offer.productUrl?.trim()

  // Van an toan: trang san pham da duoc xac nhan CHET thi lui ve link shop thay
  // vi day khach toi 404. Trang san pham bien mat thuong xuyen hon nhieu so voi
  // trang chu (het hang, go SKU), va mot deep-link chet con te hon khong deep-link.
  // Chi ap dung khi offer CO productUrl: khi khong co, `linkStatus` noi ve chinh
  // link shop, ma luc do khong con gi tot hon de lui ve.
  const productPageDead = Boolean(productUrl) && offer.linkStatus === 'broken'

  if (productUrl && !productPageDead && hostKey(productUrl)) {
    return applyTrackingParams(productUrl, store)
  }

  const offerLink = offer.link?.trim()
  if (offerLink) return offerLink

  return store.affiliateLink?.trim() || toAbsolute(store.website) || '#'
}

/**
 * Kiem tra mot o `product_url` truoc khi ghi vao Sanity. Dung chung cho importer
 * (va bat ky duong nhap lieu nao sau nay) de thong bao giong nhau o moi noi.
 */
export function validateProductUrl(
  raw: string,
  store: StoreUrlInput
): { ok: true; value: string; warning?: string } | { ok: false; error: string } {
  const value = raw.trim()
  if (!hostKey(value)) {
    return { ok: false, error: 'khong phai URL http(s) hop le' }
  }

  const productHost = hostKey(value)
  const storeHost = hostKey(store.affiliateLink) ?? hostKey(toAbsolute(store.website) ?? undefined)
  if (storeHost && productHost !== storeHost) {
    return {
      ok: true,
      value,
      warning: `link san pham o domain "${productHost}" khac domain cua store "${storeHost}" - se KHONG duoc gan ma ref, kiem tra lai co dan nham shop khong`,
    }
  }

  return { ok: true, value }
}
