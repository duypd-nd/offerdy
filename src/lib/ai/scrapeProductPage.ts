import * as cheerio from 'cheerio'
import { fetchSafely, ACCEPT_HTML } from '@/lib/safeFetch'
import { bestDescription } from '@/lib/productText'
import { fromMinorUnits } from '@/lib/scrapedPrice'
import { dedupeImageUrls } from '@/lib/imageIdentity'

// Cung gioi han voi productCatalog: du cho mot trang san pham, khong de treo lau.
const FETCH_OPTS = { timeoutMs: 15_000, maxBytes: 8_000_000 }

export type ScrapedProduct = {
  title: string
  description?: string
  images: string[]
  siteName?: string
  price?: string
  /** Gia truoc giam, chi co khi shop cong bo — xem `storeApiData`. */
  priceOrig?: string
  currency?: string
  /** Diem danh gia THAT tu `aggregateRating` trong JSON-LD. Khong co thi undefined. */
  rating?: number
  /** So luot danh gia THAT. Khong co thi undefined. */
  reviewCount?: number
}

/**
 * Diem danh gia va so luot, doc tu `aggregateRating` cua JSON-LD.
 *
 * ⚠️ CHI lay so THAT tren trang. Video co mot canh "social proof", va canh do
 * chi duoc xuat hien khi hai so nay co that — bia ra "duoc hang nghin nguoi yeu
 * thich" la dung thu ma luat cua du an cam, va la thu de bi kien nhat trong ca
 * doan video.
 *
 * Tra ve object rong khi khong co, de nguoi goi trai bang `...` ma khong tao ra
 * cac truong `undefined` thua.
 */
function docDanhGia(product: Record<string, unknown> | null): { rating?: number; reviewCount?: number } {
  const agg = product?.aggregateRating
  if (!agg || typeof agg !== 'object') return {}
  const o = agg as Record<string, unknown>
  const diem = Number(o.ratingValue)
  const soLuot = Number(o.reviewCount ?? o.ratingCount)
  const ra: { rating?: number; reviewCount?: number } = {}
  // Kep trong 1..5: vai shop khai thang 1..100, va mot diem "87 sao" tren video
  // thi lo ngay.
  if (Number.isFinite(diem) && diem > 0 && diem <= 5) ra.rating = Math.round(diem * 10) / 10
  if (Number.isFinite(soLuot) && soLuot > 0) ra.reviewCount = Math.round(soLuot)
  return ra
}

type ScrapeResult = ScrapedProduct | { error: string }

/** Mo ta trong than trang san pham, theo cac container pho bien cua Woo/Shopify. */
function bodyDescription($: cheerio.CheerioAPI): string | undefined {
  const SELECTORS = [
    '#tab-description',                              // WooCommerce (tab Description)
    '.woocommerce-Tabs-panel--description',
    '.woocommerce-product-details__short-description',
    '.product__description',                         // Shopify (nhieu theme)
    '.product-single__description',
    '[data-product-description]',
  ]
  for (const sel of SELECTORS) {
    const text = $(sel).first().text().replace(/\s+/g, ' ').trim()
    // >120 ky tu: duoi nguong nay thuong chi la nhan hoac o rong, khong phai mo ta.
    if (text.length > 120) return text
  }
  return undefined
}

/**
 * Anh tu THU VIEN SAN PHAM, doc qua API cong khai cua nen tang.
 *
 * Vi sao khong quet DOM: theme cua shop lazy-load nen the <img> khong mang `src`,
 * anh nam trong `data-src`/`data-srcset` va moi theme dat mot kieu. Do that
 * (2026-07-26): cycleaddons.com co 16 file anh tren trang nhung KHONG the <img> nao
 * mang src. Trong khi API tra ve danh sach sach va dung thu tu shop xep:
 *   Shopify      /products/<handle>.js                    -> 6 anh (tennail)
 *   WooCommerce  /wp-json/wc/store/v1/products?slug=<slug> -> 9 anh (cycleaddons)
 *
 * Truoc day chi lay JSON-LD/og:image nen ra DUNG MOT tam, lap lai 3 lan qua 3 URL
 * khac nhau — nguoi van hanh nhan 3 o tick trong y het nhau.
 */
type StoreApi = {
  images: string[]
  /** So tran, chua ghep ky hieu tien te — `scrapeProductPage` moi biet tien te nao. */
  priceSaleRaw?: string
  /**
   * Gia GOC (truoc giam). Chi dat khi shop that su cong bo va no CAO HON gia ban;
   * bang nhau nghia la khong giam, dien vao chi tao ra "-0%" tren the deal.
   */
  priceOrigRaw?: string
  currency?: string
}

const EMPTY_API: StoreApi = { images: [] }

/** Doi gia ve so, bo qua chuoi rong / 0 / khong phai so. */
function num(v: unknown): number | undefined {
  if (typeof v !== 'number' && typeof v !== 'string') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Tien te GOC cua mot shop Shopify, doc tu `/meta.json`. `undefined` neu khong
 * phai Shopify hoac shop chan duong nay.
 *
 * Dung de lam gi: xem `withCurrency` ben duoi.
 */
async function shopifyBaseCurrency(origin: string): Promise<string | undefined> {
  const res = await fetchSafely(origin + '/meta.json', { ...FETCH_OPTS, accept: 'application/json' })
  if ('error' in res || !res.res.ok) return undefined
  try {
    const data = await res.res.json() as { currency?: unknown }
    return typeof data.currency === 'string' && /^[A-Za-z]{3}$/.test(data.currency)
      ? data.currency.toUpperCase()
      : undefined
  } catch { return undefined }
}

/**
 * Gan `?currency=<ma>` de Shopify tra gia bang tien te GOC cua shop.
 *
 * ⚠️ Vi sao can: Shopify Markets doi gia theo VI TRI NGUOI XEM. Doc tu Viet Nam
 * thi tennail.com hien 837.000 ₫ — nhung Offerdy ban cho khach My/EU, nen mot
 * the deal ghi gia VND la sai voi gan nhu moi nguoi doc no. Do that 2026-08-04:
 * cung URL, khong tham so -> VND 83700000; `?currency=USD` -> USD 3120, dung bang
 * $31.20 dang hien tren trang chu Offerdy.
 *
 * Lay tien te goc cua shop chu KHONG dat cung USD: bang tien te goc la gia shop
 * that su thu, moi ma khac deu la ban quy doi theo ty gia trong ngay.
 */
function withCurrency(rawUrl: string, currency?: string): string {
  if (!currency) return rawUrl
  try {
    const u = new URL(rawUrl)
    u.searchParams.set('currency', currency)
    return u.toString()
  } catch { return rawUrl }
}

async function storeApiData(pageUrl: string, currency?: string): Promise<StoreApi> {
  let u: URL
  try { u = new URL(pageUrl) } catch { return EMPTY_API }
  const seg = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const handle = seg[seg.length - 1]
  if (!handle) return EMPTY_API

  // Shopify: duong dan san pham luon la /products/<handle>
  if (seg.includes('products')) {
    const shopify = await fetchSafely(withCurrency(u.origin + '/products/' + handle + '.js', currency), {
      ...FETCH_OPTS, accept: 'application/json',
    })
    if (!('error' in shopify) && shopify.res.ok) {
      try {
        const data = await shopify.res.json() as {
          images?: unknown
          price?: unknown
          compare_at_price?: unknown
          variants?: { price?: unknown; compare_at_price?: unknown }[]
        }
        const images = Array.isArray(data.images)
          ? data.images.filter((x): x is string => typeof x === 'string')
          : []
        if (images.length) {
          // ⚠️ Shopify tra tien te o don vi NHO (2999 = 29.99), khong phai don vi
          // chinh. Doc thang la gia gap 100 lan tren the deal.
          const v = data.variants?.[0]
          const sale = num(data.price) ?? num(v?.price)
          const orig = num(data.compare_at_price) ?? num(v?.compare_at_price)
          return {
            images,
            priceSaleRaw: fromMinorUnits(sale),
            // compare_at_price van con nguyen khi shop het khuyen mai — phai so
            // voi gia ban chu khong chi kiem tra "co gia tri hay khong".
            priceOrigRaw: orig !== undefined && sale !== undefined && orig > sale
              ? fromMinorUnits(orig)
              : undefined,
            // Shopify `.js` khong khai ma tien te — de trong, JSON-LD cua trang lo.
          }
        }
      } catch { /* khong phai JSON -> thu Woo ben duoi */ }
    }
  }

  // WooCommerce Store API (co san cung WooCommerce Blocks)
  const woo = await fetchSafely(
    u.origin + '/wp-json/wc/store/v1/products?slug=' + encodeURIComponent(handle),
    { ...FETCH_OPTS, accept: 'application/json' }
  )
  if ('error' in woo || !woo.res.ok) return EMPTY_API
  try {
    const data = await woo.res.json() as unknown
    const product = (Array.isArray(data) ? data[0] : data) as {
      images?: unknown
      prices?: {
        price?: unknown
        regular_price?: unknown
        sale_price?: unknown
        currency_code?: unknown
        currency_minor_unit?: unknown
      }
    } | undefined
    const imgs = product?.images
    const images = Array.isArray(imgs)
      ? imgs
          .map(x => (typeof x === 'string' ? x : (x as { src?: unknown })?.src))
          .filter((x): x is string => typeof x === 'string')
      : []

    // ⚠️ Woo cung tra don vi nho, nhung so chu so thap phan la BIEN — no khai
    // `currency_minor_unit` (USD = 2, JPY = 0). Chia cung cho 100 la sai voi JPY.
    const p = product?.prices
    const unit = typeof p?.currency_minor_unit === 'number' ? p.currency_minor_unit : 2
    const sale = num(p?.sale_price) ?? num(p?.price)
    const orig = num(p?.regular_price)
    return {
      images,
      priceSaleRaw: fromMinorUnits(sale, unit),
      priceOrigRaw: orig !== undefined && sale !== undefined && orig > sale
        ? fromMinorUnits(orig, unit)
        : undefined,
      currency: typeof p?.currency_code === 'string' ? p.currency_code : undefined,
    }
  } catch { return EMPTY_API }
}
function absolutize(url: string, base: string): string | null {
  try {
    return new URL(url, base).toString()
  } catch {
    return null
  }
}

function findJsonLdProduct($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]')
  for (const el of scripts.toArray()) {
    const raw = $(el).contents().text()
    if (!raw) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed]
    for (const c of candidates) {
      if (!c || typeof c !== 'object') continue
      const obj = c as Record<string, unknown>
      const graph = Array.isArray(obj['@graph']) ? (obj['@graph'] as Record<string, unknown>[]) : [obj]
      for (const node of graph) {
        const type = node['@type']
        const typeStr = Array.isArray(type) ? type.join(',') : String(type ?? '')
        if (typeStr.includes('Product')) return node
      }
    }
  }
  return null
}

/**
 * Ma tien te khi JSON-LD khong khai — do that tren 3 shop Shopify (2026-08-04):
 * ilovesoiree.com KHONG co `priceCurrency` trong JSON-LD nhung co `og:price:currency`.
 *
 * ⚠️ CHI lay tu chinh trang vua tai, TUYET DOI khong goi `/meta.json` cua Shopify.
 * `/meta.json` tra ve tien te GOC cua shop, con gia minh vua doc la tien te DANG
 * HIEN THI — Shopify Markets doi theo vi tri nguoi xem. Do that tren
 * empowerbeautiful.com tu Viet Nam: trang hien VND con `/meta.json` bao USD. Ghep
 * hai nguon do lai la gan nhan "$" cho mot con so VND.
 */
function pageCurrency($: cheerio.CheerioAPI, metaContent: (name: string) => string | undefined): string | undefined {
  const meta = metaContent('og:price:currency') || metaContent('product:price:currency')
  if (meta) return meta.trim()

  // Theme Shopify nhung khong co the meta: `Shopify.currency = {"active":"USD",...}`
  for (const el of $('script').toArray()) {
    const m = $(el).contents().text().match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Za-z]{3})"/)
    if (m) return m[1]
  }
  return undefined
}

export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  // Hoi tien te goc TRUOC khi tai trang, roi tai trang bang chinh tien te do —
  // neu chi doi tien te cho API con trang HTML van la ban dia phuong thi JSON-LD
  // se cho gia VND con API cho gia USD, ghep lai thanh mot con so sai don vi.
  // Chi ton them dung mot request, va chi voi Shopify (Woo tu khai tien te).
  let origin: string | undefined
  try { origin = new URL(url).origin } catch { origin = undefined }
  // Chi hoi khi duong dan co dang Shopify — Woo khong co /meta.json, hoi la phi mot request.
  const baseCurrency = origin && url.includes('/products/')
    ? await shopifyBaseCurrency(origin)
    : undefined
  const pageUrl = withCurrency(url, baseCurrency)

  const fetched = await fetchSafely(pageUrl, { maxBytes: 3 * 1024 * 1024, timeoutMs: 10_000, accept: ACCEPT_HTML })
  if ('error' in fetched) return { error: fetched.error }
  const { res } = fetched
  if (!res.ok) return { error: `HTTP ${res.status} khi tai "${url}"` }

  let html: string
  try {
    html = await res.text()
  } catch (err) {
    return { error: `Khong doc duoc noi dung trang: ${String(err)}` }
  }

  const $ = cheerio.load(html)
  const metaContent = (name: string) =>
    $(`meta[property="${name}"]`).attr('content') || $(`meta[name="${name}"]`).attr('content') || undefined

  const product = findJsonLdProduct($)
  const productImages = (() => {
    const img = product?.image
    if (!img) return []
    if (typeof img === 'string') return [img]
    if (Array.isArray(img)) return img.filter((x): x is string => typeof x === 'string')
    if (typeof img === 'object' && img !== null && 'url' in img) {
      const u = (img as Record<string, unknown>).url
      return typeof u === 'string' ? [u] : []
    }
    return []
  })()

  const offers = product?.offers as Record<string, unknown> | undefined
  const offersObj = Array.isArray(offers) ? offers[0] as Record<string, unknown> | undefined : offers

  const title =
    (typeof product?.name === 'string' ? product.name : undefined) ||
    metaContent('og:title') ||
    $('title').first().text().trim() ||
    undefined

  if (!title) return { error: 'Khong tim thay tieu de san pham tren trang nay' }

  // Lay mo ta DAI NHAT trong cac nguon, khong lay nguon dau tien tim thay.
  //
  // Ly do: meta/og:description la doan tom tat cho ket qua tim kiem, thuong bi cat
  // ngan. Mo ta THAT do chu shop viet nam trong than trang. Do that
  // (tarujskincare.com/product/face-cream, 2026-07-26): meta cho 277 ky tu con than
  // trang cho 1050 — va chi ban dai moi chua diem ban hang thuc su ("sau lan dung
  // dau, shop dieu chinh cong thuc theo loai da cua ban"), thu meta da cat mat.
  //
  // Quan trong voi AI Review Writer: mo ta cua chinh shop la TOAN BO du lieu that
  // ma model co. Cang mo ta day, bai review cang it phai noi chung chung.
  const description = bestDescription([
    typeof product?.description === 'string' ? product.description : undefined,
    bodyDescription($),
    metaContent('og:description'),
    metaContent('description'),
  ])

  const ogImages = $('meta[property="og:image"]').map((_, el) => $(el).attr('content')).get().filter(Boolean) as string[]
  const twitterImage = metaContent('twitter:image')

  const api = await storeApiData(pageUrl, baseCurrency)

  // Thu vien san pham dat TRUOC: day la anh that cua san pham, dung thu tu shop
  // xep. og:image/JSON-LD thuong chi la mot anh dai dien, de sau lam du phong.
  const allImages = [
    ...api.images,
    ...productImages,
    ...ogImages,
    ...(twitterImage ? [twitterImage] : []),
  ]
    .map(u => absolutize(u, url))
    .filter((u): u is string => !!u)

  // Bo trung theo DINH DANH anh, khong theo chuoi URL: cung mot tam co the den qua
  // 3 URL khac nhau (CDN Jetpack + tham so kich thuoc) — xem src/lib/imageIdentity.ts
  const images = dedupeImageUrls(allImages)

  const ldPrice = typeof offersObj?.price === 'string' || typeof offersObj?.price === 'number'
    ? String(offersObj.price)
    : undefined
  const ldCurrency = typeof offersObj?.priceCurrency === 'string' ? offersObj.priceCurrency : undefined

  // JSON-LD chi cong bo MOT gia — gia dang ban. Gia goc nam trong API cua nen tang
  // shop (`compare_at_price` cua Shopify, `regular_price` cua Woo), cung mot lan goi
  // da dung de lay thu vien anh nen khong ton them request nao.
  const price = ldPrice ?? api.priceSaleRaw
  // Woo tu khai ma tien te; Shopify thi khong, phai nhat tren chinh trang do.
  const currency = ldCurrency ?? api.currency ?? pageCurrency($, metaContent)

  return {
    title,
    description,
    images,
    siteName: metaContent('og:site_name'),
    price,
    priceOrig: api.priceOrigRaw,
    currency,
    ...docDanhGia(product),
  }
}
