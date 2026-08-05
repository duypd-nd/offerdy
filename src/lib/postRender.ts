/**
 * Thay the vuong trong than bai bang HTML that, **luc goi trang**.
 *
 * Vi sao giai luc goi trang chu khong luc luu: gia troi tung ngay, ma giam het han,
 * ma ref cua shop co the doi. Bai luu san HTML la bai dong bang mot su that cua ngay
 * viet — dung cai bay da lam 8/23 review di ra merchant TRAN vi link duoc dong bang
 * tu luc soan.
 *
 * Ham thuan: khong fetch, khong Sanity, khong env — moi thu can biet duoc truyen vao.
 */

export type RenderProduct = {
  url: string
  title: string
  imageUrl?: string
  /** Gia chup lai luc viet bai. Trang PHAI noi ro do la gia luc nao. */
  priceAtWriting?: string
  currency?: string
  capturedAt?: string
}

export type RenderOptions = {
  products: RenderProduct[]
  comparisonRows?: { label: string; values: string[] }[]
  /** Ma giam cua shop tai THOI DIEM GOI TRANG — null neu khong con. */
  coupon?: { code: string } | null
  storeName?: string
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}
function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ESCAPES[c])
}

/** `298.75` + `USD` -> `$298.75`. Khong biet ky hieu thi ghi ma tien te. */
const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', VND: '₫' }
export function formatPrice(price?: string, currency?: string): string | null {
  const value = price?.trim()
  if (!value) return null
  if (/^[$£€₫]/.test(value)) return value
  if (!currency) return value
  const symbol = SYMBOLS[currency.toUpperCase()]
  return symbol ? `${symbol}${value}` : `${value} ${currency.toUpperCase()}`
}

/**
 * ⚠️ Go **CA THE BOC** khi khong con ma giam, khong chi go token.
 *
 * Cau *"dung ma  khi thanh toan"* te hon la im lang: no khai co mot thu ma no khong
 * dua ra, va nguoi doc di tim mot cai khong ton tai. Day dung la bai hoc
 * `findUnsafeText` da hoc voi `{coupon}` ben caption — chi khac la o day ma co the
 * bien mat SAU khi bai da dang, nen prompt khong the lo duoc, chi render moi lo duoc.
 */
export function renderCouponToken(html: string, coupon?: { code: string } | null): string {
  if (!html.includes('[COUPON]')) return html
  if (coupon?.code) {
    return html.replaceAll('[COUPON]', `<strong class="article-coupon">${esc(coupon.code)}</strong>`)
  }
  // Bo tron the khoi (doan van / muc danh sach) nao co chua token.
  const stripped = html.replace(
    /<(p|li)\b[^>]*>(?:(?!<\/?\1\b)[\s\S])*?\[COUPON\][\s\S]*?<\/\1>/gi,
    ''
  )
  // Con sot (token nam ngoai moi the khoi) thi go not — tha mat mot cau con hon de
  // lo chuoi "[COUPON]" ra mat nguoi doc.
  return stripped.replaceAll('[COUPON]', '')
}

/**
 * `[PRICE:n]` / `[WAS:n]`. Khong co gia thi go token va **khong de lai khoang trang
 * kep** — cau van phai doc duoc ca khi shop go gia xuong.
 */
export function renderPriceTokens(html: string, products: RenderProduct[]): string {
  return html.replace(/\[(PRICE|WAS):(\d+)\]/g, (whole, kind: string, index: string) => {
    const p = products[Number(index) - 1]
    if (!p) return ''
    const price = formatPrice(kind === 'PRICE' ? p.priceAtWriting : undefined, p.currency)
    return price ? `<span class="article-price">${esc(price)}</span>` : ''
  })
}

/**
 * Cat anh ngay tai CDN cua shop.
 *
 * Do that tren bai Frizzlife: anh goc **1614x1614** duoc do vao mot o rong **300px**.
 * The `<img>` o day khong di qua `next/image` (no nam trong HTML sinh ra), nen khong
 * ai cat ho — dung kieu ro ri ma du an da vet mot lan o anh Sanity.
 *
 * ⚠️ CHI them tham so khi biet chac CDN hieu no. Nhet mot tham so la vao URL anh la
 * cach lam vo anh — chinh vi vay `getStoreRefForHtml` co y khong dung toi `<img src>`.
 * `cdn.shopify.com` co `width` la tham so chinh thuc; host khac thi de nguyen.
 */
export function cappedImageUrl(url: string, width = 700): string {
  try {
    const u = new URL(url)
    if (u.hostname !== 'cdn.shopify.com') return url
    if (u.searchParams.has('width')) return url
    u.searchParams.set('width', String(width))
    return u.toString()
  } catch {
    return url
  }
}

function productLink(p: RenderProduct, label: string, className: string): string {
  // Tham so tiep thi KHONG gan o day — `getStoreRefForHtml` chay sau va gan cho moi
  // <a> trong than bai. Gan hai noi la co hai cho de lech.
  return `<a class="${className}" href="${esc(p.url)}" target="_blank" rel="nofollow sponsored noopener">${esc(label)}</a>`
}

function renderTable(rows: { label: string; values: string[] }[], products: RenderProduct[]): string {
  if (!rows.length) return ''
  const head = products.map(p => `<th scope="col">${esc(p.title)}</th>`).join('')
  const body = rows
    .map(r => `<tr><th scope="row">${esc(r.label)}</th>${r.values.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`)
    .join('')
  // Dung dung kieu bang da dung o `globals.css` (`.article-table-wrap`), khong nhoi
  // mot khoi <style> vao tung bai — 6 bai blog cu moi bai mang mot khoi CSS rieng,
  // sua mot lan la phai sua sau cho.
  return `<div class="article-table-wrap"><table><thead><tr><th scope="col"></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

/** Dong "gia tai thoi diem viet" — bat buoc khi co hien gia. */
export function priceNote(products: RenderProduct[]): string | null {
  const stamps = products.map(p => p.capturedAt).filter((d): d is string => !!d)
  if (!stamps.length || !products.some(p => p.priceAtWriting)) return null
  const newest = stamps.sort().at(-1)!
  const day = new Date(newest).toISOString().slice(0, 10)
  return `Prices shown were captured on ${day} and may have changed since.`
}

/**
 * Thay toan bo the vuong. Thu tu co y: bang truoc (no co the chua chu), roi anh/CTA,
 * roi gia, cuoi cung la ma giam — vi buoc ma giam co the XOA ca doan van, nen chay
 * sau cung de khong xoa nham mot doan vua duoc dung xong.
 */
export function renderPostTokens(html: string, opts: RenderOptions): string {
  const { products } = opts
  let out = html

  out = out.replaceAll('[TABLE]', renderTable(opts.comparisonRows ?? [], products))

  /**
   * Anh san pham ra mot khoi NOI, so le trai/phai theo so thu tu san pham.
   *
   * Vi sao dung `float` chu khong phai grid: model viet HTML tu do, minh khong biet
   * doan chu nao thuoc ve san pham nao. `float` khong doi biet dieu do — chu nao dung
   * sau the anh se tu chay quanh no. San pham le nam trai, chan nam phai, thanh bo cuc
   * zic-zac ma khong phai dong khuon cau truc bai.
   *
   * `<h2>`/`<h3>` duoc dat `clear:both` trong globals.css, nen moi muc bat dau sach.
   */
  out = out.replace(/\[IMAGE:(\d+)\]/g, (_w, i: string) => {
    const n = Number(i)
    const p = products[n - 1]
    if (!p?.imageUrl) return ''
    const side = n % 2 === 1 ? 'left' : 'right'
    return (
      `<figure class="article-figure article-figure--${side}">` +
      `<img src="${esc(cappedImageUrl(p.imageUrl))}" alt="${esc(p.title)}" loading="lazy" />` +
      `<figcaption>${esc(p.title)}</figcaption>` +
      `</figure>`
    )
  })

  out = out.replace(/\[PRODUCT:(\d+)\]/g, (_w, i: string) => {
    const p = products[Number(i) - 1]
    return p ? esc(p.title) : ''
  })

  out = out.replace(/\[CTA:(\d+)\]/g, (_w, i: string) => {
    const p = products[Number(i) - 1]
    if (!p) return ''
    return productLink(p, `Check ${p.title} at ${opts.storeName ?? 'the store'}`, 'article-cta')
  })

  out = renderPriceTokens(out, products)
  out = renderCouponToken(out, opts.coupon)

  // Doan van rong sinh ra sau khi go token — don di de bai khong co khoang trong la.
  return out.replace(/<p>\s*<\/p>/gi, '')
}

/** Con the nao chua duoc thay khong — dung de khong bao gio de lo the ra mat nguoi doc. */
export function remainingTokens(html: string): string[] {
  return [...new Set([...html.matchAll(/\[[A-Z]+(?::\d+)?\]/g)].map(m => m[0]))]
}
