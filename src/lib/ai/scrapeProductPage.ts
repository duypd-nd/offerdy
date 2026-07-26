import * as cheerio from 'cheerio'
import { fetchSafely } from '@/lib/safeFetch'
import { bestDescription } from '@/lib/productText'

export type ScrapedProduct = {
  title: string
  description?: string
  images: string[]
  siteName?: string
  price?: string
  currency?: string
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

export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
  const fetched = await fetchSafely(url, { maxBytes: 3 * 1024 * 1024, timeoutMs: 10_000, accept: 'text/html' })
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

  const allImages = [...productImages, ...ogImages, ...(twitterImage ? [twitterImage] : [])]
    .map(u => absolutize(u, url))
    .filter((u): u is string => !!u)

  const images = Array.from(new Set(allImages)).slice(0, 6)

  const price = typeof offersObj?.price === 'string' || typeof offersObj?.price === 'number'
    ? String(offersObj.price)
    : undefined
  const currency = typeof offersObj?.priceCurrency === 'string' ? offersObj.priceCurrency : undefined

  return {
    title,
    description,
    images,
    siteName: metaContent('og:site_name'),
    price,
    currency,
  }
}
