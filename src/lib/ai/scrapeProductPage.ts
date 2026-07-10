import * as cheerio from 'cheerio'
import { fetchSafely } from '@/lib/safeFetch'

export type ScrapedProduct = {
  title: string
  description?: string
  images: string[]
  siteName?: string
  price?: string
  currency?: string
}

type ScrapeResult = ScrapedProduct | { error: string }

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

  const description =
    (typeof product?.description === 'string' ? product.description : undefined) ||
    metaContent('og:description') ||
    metaContent('description')

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
