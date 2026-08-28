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
import { shortProductNames } from '@/lib/productShortName'

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

/**
 * Anh + TEN + gia + nut mua, trong MOT khoi.
 *
 * ⚠️ Ten san pham nam ngay canh anh la ly do ton tai cua khoi nay. Ban truoc tha anh
 * noi (`float`) giua dong chu: bai chin san pham thi anh cua san pham 2 trot nam canh
 * doan noi ve san pham 5, va nguoi doc khong co cach nao biet minh dang nhin mon nao.
 * Chu thich duoi anh khong cuu duoc — no o duoi, con doan chu thi o ben.
 *
 * Khoi nay chay het chieu ngang cot bai, nen khong con chu nao chay quanh anh, va
 * khong con canh chu sat vien anh.
 */
function renderProductCard(p: RenderProduct, storeName?: string): string {
  const price = formatPrice(p.priceAtWriting, p.currency)
  const media = p.imageUrl
    ? `<div class="article-card-media">` +
      `<img src="${esc(cappedImageUrl(p.imageUrl))}" alt="${esc(p.title)}" loading="lazy" />` +
      `</div>`
    : ''
  return (
    `<div class="article-card">` +
    media +
    `<div class="article-card-body">` +
    `<span class="article-card-name">${esc(p.title)}</span>` +
    (price ? `<span class="article-card-price">${esc(price)}</span>` : '') +
    // Nhan ngan: ten mon hang da nam ngay tren nut roi. Nhan cu ("Check <ca cai ten
    // dai> at <shop>") lam nut dai bang ca dong van va bo cuc vo ra.
    productLink(p, `Check price at ${storeName ?? 'the store'}`, 'article-cta article-card-cta') +
    `</div>` +
    `</div>`
  )
}

/**
 * Keo `[IMAGE:n]` RA KHOI doan van truoc khi dung the.
 *
 * The san pham la mot `<div>`, ma `<div>` nam trong `<p>` la HTML khong hop le: trinh
 * duyet tu dong dong the `<p>` lai ngay truoc no va mo mot the moi sau — nua doan van
 * bi nem ra ngoai vung `<p>`, mat luon khoang cach dong. Tu cat doan van thi minh biet
 * duong cat o dau.
 */
function liftImageTokens(html: string): string {
  return html.replace(/(<p\b[^>]*>)([\s\S]*?)<\/p>/gi, (whole, open: string, inner: string) => {
    if (!/\[IMAGE:\d+\]/.test(inner)) return whole
    return inner
      .split(/(\[IMAGE:\d+\])/)
      .map(part => (/^\[IMAGE:\d+\]$/.test(part) ? part : part.trim() ? `${open}${part}</p>` : ''))
      .join('')
  })
}

/**
 * `[CTA:n]` DINH DUOI CUOI mot doan van khong phai la the giua cau — do la mot duong
 * mua dung rieng, chi tinh co nam trong the `<p>`. Doi no thanh `[CTABLOCK:n]`.
 *
 * ⚠️ Phan biet duoc hai kieu nay moi la cho quan trong. Do that tren bai Babywonders:
 * model ket doan bang `… purely visual. [CTA:3] [CTA:4]`, hai link chu dat canh nhau
 * chi cach mot dau cach — doc ra thanh MOT chuoi ten dai vo nghia, khong ai biet no
 * la hai link. Con `… for the same baby, [CTA:1] gets you there` thi lai la the giua
 * cau that, va cai do phai giu nguyen dang link chu.
 *
 * Luat: dinh duoi cuoi -> khoi; con lai -> chu.
 */
function liftTrailingCtas(html: string): string {
  return html.replace(/(<p\b[^>]*>)([\s\S]*?)<\/p>/gi, (whole, open: string, inner: string) => {
    const tail = inner.match(/(?:\s*\[CTA:\d+\])+\s*$/)
    if (!tail) return whole
    const lifted = (tail[0].match(/\[CTA:\d+\]/g) ?? []).map(t => `[CTABLOCK:${t.slice(5)}`).join('')
    const rest = inner.slice(0, tail.index).trim()
    return (rest ? `${open}${rest}</p>` : '') + lifted
  })
}

/**
 * Bang so sanh. Danh SO thu tu cho tung san pham, va so do di theo tung o gia tri.
 *
 * 🚨 VI SAO CAN DANH SO — do that 28/08/2026 tren dien thoai 390px:
 * bang ba cot (nhan + 2 san pham) rong hon man hinh, nen cot san pham THU HAI nam
 * hoan toan ngoai khung. Mot bang *so sanh* chi hien duoc MOT san pham, tuc mat han
 * ly do ton tai cua bai. `overflow-x:auto` co cuu duoc ve mat ky thuat, nhung khong
 * co dau hieu nao bao phai cuon — khach den tu quang cao khong bao gio biet.
 *
 * ⚠️ Va KHONG the dung ten rut gon lam nhan cot. Thu `shortProductNames()` tren
 * dung hai tieu de that cua bai dang chay quang cao:
 *     "BODEGACOOLER 12 Volt Car Refrigerator, 61QT(58L)..." -> "61QT(58L"  (hong ngoac)
 *     "BODEGACOOLER 12 Volt Car Refrigerator, 16 Quart..."  -> "Car"       (vo nghia)
 * Module do da tu ghi truoc rui ro nay ("tieu de nhoi thong so"). Va cat bot tu ben
 * TRAI cung vo dung: hai tieu de dung chung 37 ky tu dau, nen moi ban cat deu ra hai
 * nhan GIONG HET nhau.
 *
 * Nen: tieu de day du hien MOT LAN o dau bang (kem so thu tu), roi moi o gia tri chi
 * mang con so. Khong phu thuoc vao phep rut gon nao ca.
 */
function renderTable(rows: { label: string; values: string[] }[], products: RenderProduct[]): string {
  if (!rows.length) return ''
  const head = products
    .map((p, i) => `<th scope="col"><span class="cmp-idx">${i + 1}</span>${esc(p.title)}</th>`)
    .join('')
  const body = rows
    .map(r => `<tr><th scope="row">${esc(r.label)}</th>${
      r.values.map((v, i) => `<td data-idx="${i + 1}">${esc(v)}</td>`).join('')
    }</tr>`)
    .join('')
  // Dung dung kieu bang da dung o `globals.css` (`.article-table-wrap`), khong nhoi
  // mot khoi <style> vao tung bai — 6 bai blog cu moi bai mang mot khoi CSS rieng,
  // sua mot lan la phai sua sau cho.
  // ⚠️ `cmp-fit` (chia deu cot, vua khung) CHI cho bang it cot. Do 28/08: bat no cho
  // bai 12 san pham lam moi cot con ~61px va chu vo tung chu cai mot dong. Bang nhieu
  // cot thi de no rong va cuon ngang — do la dang dung cua no.
  const cls = products.length <= 3 ? 'cmp-table cmp-fit' : 'cmp-table'
  return `<div class="article-table-wrap"><table class="${cls}"><thead><tr><th scope="col"></th>${head}</tr></thead><tbody>${body}</tbody></table></div>`
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

  let cachedShort: string[] | null = null
  const shortNames = () =>
    (cachedShort ??= shortProductNames(products.map(p => p.title), { storeName: opts.storeName }))

  out = out.replaceAll('[TABLE]', renderTable(opts.comparisonRows ?? [], products))

  /**
   * `[IMAGE:n]` -> the san pham (anh + ten + gia + nut mua), nam tren dong rieng.
   *
   * Ghi lai san pham nao da co the: buoc `[CTA:n]` ngay duoi can biet dieu do de khong
   * do them mot nut thu hai cho cung mot mon.
   */
  out = liftTrailingCtas(liftImageTokens(out))

  const carded = new Set<number>()

  out = out.replace(/\[IMAGE:(\d+)\]/g, (_w, i: string) => {
    const n = Number(i)
    const p = products[n - 1]
    if (!p?.imageUrl) return ''
    carded.add(n)
    return renderProductCard(p, opts.storeName)
  })

  /**
   * Duong mua DUNG RIENG (`[CTABLOCK:n]`, xem `liftTrailingCtas`) -> cung thanh the.
   *
   * Do that tren bai Babywonders: model dat chin `[CTA:n]` lien tiep, ra chin thanh
   * xanh chong len nhau khong ke gi nhau va khong nut nao noi ro no dan toi mon nao.
   * Mot the mang du anh + ten + gia thay cho mot thanh chu tran.
   *
   * San pham DA co the roi thi bo han the nay di: hai nut cho cung mot mon la thu da
   * lam bai truoc roi rac. San pham chua co the (thuong la khong cao duoc anh) thi
   * dung the o day — the khong co phan anh, nhung van du ten, gia va duong mua, nen
   * no khong bi thiet so voi cac mon co anh.
   */
  out = out.replace(/\[CTABLOCK:(\d+)\]/g, (_w, i: string) => {
    const n = Number(i)
    const p = products[n - 1]
    if (!p || carded.has(n)) return ''
    carded.add(n)
    return renderProductCard(p, opts.storeName)
  })

  /**
   * `[PRODUCT:n]` -> ten day du cua shop. `[PRODUCT:n|short]` -> ten ngan do code suy ra.
   *
   * ⚠️ Khoan dung CO CHU DICH voi bien the la: cong kiem luc GHI da chan moi bien the
   * ngoai `short` roi, con luat cua tang render la "khong bao gio de lo the ra mat nguoi
   * doc". Nem tra ve chuoi rong hay giu nguyen the thi mot bien the la se hien ra trang.
   * Roi ve ten day du thi trong huong nao cung an toan.
   *
   * Ten ngan tinh MOT LAN cho moi lan goi (closure ghi nho): no phu thuoc ca lo san pham
   * chu khong phai tung cai, va 42 bai cu khong he co `|short` nao nen khong ton gi.
   */
  out = out.replace(/\[PRODUCT:(\d+)(?:\|([A-Za-z]+))?\]/g, (_w, i: string, mod?: string) => {
    const n = Number(i)
    const p = products[n - 1]
    if (!p) return ''
    return esc(mod === 'short' ? shortNames()[n - 1] : p.title)
  })

  /**
   * `[CTA:n]` con lai la the nam GIUA CAU — ra link chu, khong ra nut.
   *
   * Cau *"…neu ban cung can mot lop ao am, [CTA:1] dua ban toi do"* voi mot nut xanh
   * chen giua thi cau van bi be doi: nut la khoi, chu chay quanh no thanh hai manh roi
   * rac. Lay dung ten mon hang lam chu link thi cau doc lien mach, va van la mot duong
   * mua co gan `rel="sponsored"` nhu nut.
   */
  out = out.replace(/\[CTA:(\d+)\]/g, (_w, i: string) => {
    const p = products[Number(i) - 1]
    if (!p) return ''
    return productLink(p, p.title, 'article-buylink')
  })

  out = renderPriceTokens(out, products)
  out = renderCouponToken(out, opts.coupon)

  // Doan van rong sinh ra sau khi go token — don di de bai khong co khoang trong la.
  return out.replace(/<p\b[^>]*>\s*<\/p>/gi, '')
}

/**
 * Con the nao chua duoc thay khong — dung de khong bao gio de lo the ra mat nguoi doc.
 *
 * ⚠️ Bat rong co chu dich: viec cua ham nay chi la "con sot gi khong", nen no phai thay
 * ca nhung the DI DANG (`[PRODUCT:3|SHORT]`, `[CTA:1|plural]`) chu khong chi cac the
 * dung khuon. Bat hep thi mot the sai chinh ta se lot qua ca phep kiem nay lan phep thay
 * the, roi hien nguyen dang cho nguoi doc.
 */
export function remainingTokens(html: string): string[] {
  return [...new Set([...html.matchAll(/\[[A-Z][^\]\s]{0,24}\]/g)].map(m => m[0]))]
}
