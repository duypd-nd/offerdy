/**
 * Doc danh muc san pham cong khai cua mot shop, de goi y `offer.productUrl`.
 *
 * Ly do ton tai: dan tay 86 link san pham la nut that that su cua tinh nang
 * deep-link. Nhung URL o day KHONG phai do AI nghi ra — chung duoc chinh shop
 * cong bo (Shopify `/products.json`, hoac product sitemap ma moi shop deu phai
 * mo cho cong cu tim kiem). Vi vay day la du lieu that, khong vi pham nguyen tac
 * khong bia thong tin affiliate. Du vay module nay chi GOI Y — viec ghi vao
 * Sanity luon do nguoi van hanh bam duyet.
 *
 * Thuc te 28 shop cua Offerdy (do 2026-07-26): 9 shop Shopify mo /products.json,
 * 17 shop con lai la WooCommerce/WordPress co product sitemap, 2 shop khong doc
 * duoc (venatos.com bi Shopify khoa "Store unavailable", graywhaletechnology.com
 * khong co sitemap). Nen phai co CA HAI chien luoc, khong the chi lam Shopify.
 */
import { fetchSafely } from '@/lib/safeFetch'

export type CatalogProduct = {
  url: string
  title: string
}

export type CatalogResult =
  | { ok: true; products: CatalogProduct[]; source: 'shopify' | 'sitemap' }
  | { ok: false; error: string }

const MAX_PRODUCTS = 1000
const MAX_SUB_SITEMAPS = 5
const FETCH_OPTS = { timeoutMs: 15_000, maxBytes: 8_000_000 }

function baseUrl(website: string): string | null {
  const value = website.trim()
  if (!value) return null
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const u = new URL(withScheme)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

/** `hydrating-creamy-face-wash` -> `hydrating creamy face wash` */
function slugToTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/\.(html?|php)$/i, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function locsFrom(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1])
}

// ── Chien luoc A: Shopify /products.json ──────────────────────────────
async function fromShopify(base: string): Promise<CatalogProduct[] | null> {
  const result = await fetchSafely(`${base}/products.json?limit=250`, {
    ...FETCH_OPTS,
    accept: 'application/json',
  })
  if ('error' in result || !result.res.ok) return null

  let data: unknown
  try {
    data = await result.res.json()
  } catch {
    return null
  }
  const products = (data as { products?: unknown })?.products
  if (!Array.isArray(products)) return null

  const out: CatalogProduct[] = []
  for (const raw of products) {
    const p = raw as { handle?: unknown; title?: unknown }
    if (typeof p.handle !== 'string' || !p.handle) continue
    out.push({
      url: `${base}/products/${p.handle}`,
      // Tieu de that tu shop van tot hon suy tu slug — chi lui ve slug khi thieu.
      title: typeof p.title === 'string' && p.title.trim() ? p.title.trim() : slugToTitle(p.handle),
    })
    if (out.length >= MAX_PRODUCTS) break
  }
  return out.length ? out : null
}

// ── Chien luoc B: product sitemap (WooCommerce, va Shopify chan products.json) ──
async function fromSitemap(base: string): Promise<CatalogProduct[] | null> {
  const index = await fetchSafely(`${base}/sitemap.xml`, { ...FETCH_OPTS, accept: 'application/xml' })
  if ('error' in index || !index.res.ok) return null
  const indexXml = await index.res.text()

  const rootLocs = locsFrom(indexXml)
  // ⚠️ Phan biet SITEMAP CON voi TRANG SAN PHAM bang duoi `.xml`, khong bang chu
  // "product" trong URL. Loc theo chu "product" don thuan lam
  // `https://fulcrumsurf.com/product/employment/` bi coi la sitemap con roi di
  // nap ve mot trang HTML — khong co <loc> nao, shop coi nhu doc that bai. Da
  // that su xay ra voi heoxo.com va fulcrumsurf.com (sitemap phang, khong index).
  const childSitemaps = rootLocs.filter(loc => /\.xml(\?|$)/i.test(loc))

  // Sitemap con danh RIENG cho san pham: `product-sitemap.xml` (Yoast),
  // `sitemap_products_1.xml` (Shopify). Phai loai `product_cat` / `product_tag` /
  // `product_brand`: cung chua chu "product" nhung ben trong la trang DANH MUC.
  // Bo qua buoc nay thi offer "50% Off Pet Food" duoc goi y
  // `/product-category/pet-food/` — trong nhu dung ma khong phai trang san pham
  // (da thay that o Paws at Peace khi chay thu).
  const productSitemaps = childSitemaps.filter(
    loc => /product/i.test(loc) && !/product[-_](cat|categor|tag|brand)/i.test(loc)
  )

  let urls: string[]
  /** Nguon chi chua san pham -> nhan het. Nguon lan lon -> phai loc theo duong dan. */
  let trusted: boolean

  if (productSitemaps.length) {
    urls = await collectLocs(productSitemaps.slice(0, MAX_SUB_SITEMAPS))
    trusted = true
  } else if (childSitemaps.length) {
    // Index nhung khong sitemap nao ten "product" — quet cac sitemap con roi loc
    // theo duong dan thay vi bo cuoc.
    urls = await collectLocs(childSitemaps.slice(0, MAX_SUB_SITEMAPS))
    trusted = false
  } else {
    // /sitemap.xml phang: chinh no la danh sach trang.
    urls = rootLocs
    trusted = false
  }

  const out: CatalogProduct[] = []
  const seen = new Set<string>()
  for (const loc of urls) {
    if (/\.xml(\?|$)/i.test(loc)) continue
    if (seen.has(loc)) continue
    let path: string
    try {
      path = new URL(loc).pathname
    } catch {
      continue
    }
    if (!trusted && !PRODUCT_PATH.test(path)) continue
    const slug = path.replace(/\/+$/, '').split('/').filter(Boolean).pop()
    if (!slug) continue
    seen.add(loc)
    out.push({ url: loc, title: slugToTitle(slug) })
    if (out.length >= MAX_PRODUCTS) break
  }
  return out.length ? out : null
}

/** Duong dan cua trang san pham o cac nen tang pho bien (Woo, Shopify, custom). */
const PRODUCT_PATH = /\/(product|products|shop|item|items)\/[^/]/i

async function collectLocs(sitemapUrls: string[]): Promise<string[]> {
  const all: string[] = []
  for (const src of sitemapUrls) {
    const r = await fetchSafely(src, { ...FETCH_OPTS, accept: 'application/xml' })
    if ('error' in r || !r.res.ok) continue
    all.push(...locsFrom(await r.res.text()))
    if (all.length >= MAX_PRODUCTS * 2) break
  }
  return all
}

export async function fetchProductCatalog(website: string): Promise<CatalogResult> {
  const base = baseUrl(website)
  if (!base) return { ok: false, error: 'Website cua store khong phai URL hop le' }

  const shopify = await fromShopify(base)
  if (shopify) return { ok: true, products: shopify, source: 'shopify' }

  const sitemap = await fromSitemap(base)
  if (sitemap) return { ok: true, products: sitemap, source: 'sitemap' }

  return {
    ok: false,
    error: 'Khong doc duoc danh muc san pham (shop khong mo /products.json lan product sitemap, hoac shop da ngung hoat dong)',
  }
}

// ── Khop tieu de offer voi san pham ───────────────────────────────────

/**
 * Tu bi loai khoi tieu de offer truoc khi khop. Gan het la ngon ngu khuyen mai
 * ("20% Off On Your Order at X with this exclusive offer") — giu lai chung thi
 * moi offer deu khop voi moi san pham.
 */
const NOISE = new Set([
  'off', 'sale', 'save', 'saving', 'savings', 'discount', 'discounts', 'deal', 'deals',
  'offer', 'offers', 'exclusive', 'coupon', 'code', 'promo', 'promotion', 'clearance',
  'free', 'shipping', 'delivery', 'order', 'orders', 'purchase', 'buy', 'get', 'extra',
  'your', 'you', 'with', 'this', 'that', 'the', 'and', 'for', 'from', 'all', 'any',
  'at', 'on', 'in', 'of', 'to', 'up', 'over', 'under', 'now', 'today', 'new', 'only',
  'sitewide', 'storewide', 'entire', 'everything', 'select', 'selected', 'items', 'item',
  'product', 'products', 'shop', 'store', 'online', 'first', 'plus', 'limited', 'time',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Tu con lai sau khi bo nhieu. So it hon 2 tu = offer nay noi ve CA SHOP
 * ("10% Off On Your Order at Venatos"), khong phai mot san pham — truong hop do
 * khong duoc goi y gi ca, vi mot goi y sai con te hon khong goi y.
 */
export function meaningfulTokens(offerTitle: string): string[] {
  const seen = new Set<string>()
  for (const t of tokenize(offerTitle)) {
    if (NOISE.has(t)) continue
    if (/^\d+$/.test(t)) continue // "20" trong "20% off"
    if (t.length < 2) continue
    seen.add(t)
  }
  return [...seen]
}

export type Suggestion = { url: string; title: string; score: number; matched: string[] }

/**
 * Token vua chu vua so — gan nhu luon la MA MODEL/SKU: `pd1200`, `m800`, `x2`,
 * `t2596m`. Day la dieu kien BAT BUOC, khong phai mot tu ngang hang voi cac tu
 * khac.
 *
 * Vi sao can: offer "PD1200 RO Water Filter - Save $219" tung duoc goi y
 * `/products/fcr100` — "FCR100+ Replacement RO Membrane Filter Cartridge" — chi
 * vi trung ba tu chung "ro/water/filter" (75%). Do la mot LOI LOC THAY THE, khong
 * phai bo loc PD1200; khach cho giam $219 lai roi vao trang phu kien. Shop that
 * ra khong he co PD1200 (chi co PD1000-N/PD800-N/PD600-N), nen cau tra loi dung
 * la KHONG GOI Y GI.
 */
const MODEL_CODE = /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/

export function modelCodes(tokens: string[]): string[] {
  return tokens.filter(t => MODEL_CODE.test(t))
}

/**
 * ⚠️ KHONG dung `fuzzyMatch`/`fuzzyScore` trong `src/lib/fuzzy.ts`: chung chi
 * khop MOT tu, nem ca cum vao thi chi trung khi trung nguyen chuoi con. Cham
 * diem theo TUNG token roi cong lai la cach da dung cho o tim kiem `/links`.
 */
export function suggestProducts(
  offerTitle: string,
  products: CatalogProduct[],
  limit = 4
): Suggestion[] {
  const wanted = meaningfulTokens(offerTitle)
  if (wanted.length < 2) return []

  // Neu tieu de offer co ma model, san pham PHAI mang dung ma do. Khong co thi
  // loai han — mot san pham khac model la mot san pham khac, du ten trung nhieu tu.
  const requiredCodes = modelCodes(wanted)

  const scored: Suggestion[] = []
  for (const p of products) {
    const haystack = new Set([...tokenize(p.title), ...tokenize(p.url)])
    if (requiredCodes.length && !requiredCodes.every(code => haystack.has(code))) continue
    const matched = wanted.filter(t => haystack.has(t))
    if (!matched.length) continue
    // Ty le tu cua offer duoc san pham dap ung. Chia cho so tu MONG MUON chu
    // khong phai so tu cua san pham: ten san pham dai khong bi phat.
    const score = matched.length / wanted.length
    if (score < 0.5) continue
    scored.push({ url: p.url, title: p.title, score, matched })
  }

  return scored
    .sort((a, b) =>
      b.score - a.score ||
      // Cung diem: ten ngan hon thuong la san pham dung chu khong phai bien the.
      tokenize(a.title).length - tokenize(b.title).length
    )
    .slice(0, limit)
}
