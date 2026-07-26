/**
 * Khop tieu de offer voi san pham trong danh muc cua shop.
 *
 * Tach rieng khoi productCatalog.ts (phan DOC danh muc qua mang) vi day la logic
 * THUAN: khong fetch, khong Sanity, khong env — nho vay test duoc truc tiep bang
 * `node --test` ma khong can dung tan mot request nao.
 */


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

/** Mot san pham doc duoc tu danh muc cong khai cua shop. */
export type CatalogProduct = {
  url: string
  title: string
}

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
