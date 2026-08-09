/**
 * Noi deal voi store qua domain: gan lien ket tiep thi, dien ten shop, lay ma coupon.
 *
 * Du lieu store lay tu production 2026-07-26. Pupino co that va KHONG co ma coupon —
 * giu lai vi ca "shop khong co ma" moi la ca de sinh hop coupon rong.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchStoreByUrl, couponForDealUrl, applyStoreRefToDealUrl, resolveDealLink,
  applyStoreRefToHtmlLinks, dealBelongsToStore, displayStoreName,
  type StoreHostRow,
} from '@/lib/dealStoreMatch'

const stores: StoreHostRow[] = [
  {
    slug: 'kyokuknives', name: 'Kyokuknives',
    website: 'https://kyokuknives.com', affiliateLink: 'https://kyokuknives.com/?ref=offerdy',
    couponCode: 'OFFERDY', couponOfferText: '10% off your order',
  },
  {
    slug: 'frizzlife', name: 'Frizzlife',
    website: 'https://www.frizzlife.com',
    affiliateLink: 'https://www.frizzlife.com/?ref=offerdy&utm_source=affiliate',
    couponCode: 'AQNCPYIX',
  },
  { slug: 'pupino', name: 'Pupino', website: 'https://pupino.pl', affiliateLink: 'https://pupino.pl/?ref=offerdy' },
]

test('khop store qua website va qua affiliateLink', () => {
  assert.equal(matchStoreByUrl('https://kyokuknives.com/products/santoku', stores)?.slug, 'kyokuknives')
  assert.equal(matchStoreByUrl('https://pupino.pl/?ref=offerdy', stores)?.slug, 'pupino')
})

test('www. o mot ben khong lam lech phep khop', () => {
  assert.equal(matchStoreByUrl('https://www.kyokuknives.com/p/x', stores)?.slug, 'kyokuknives')
  assert.equal(matchStoreByUrl('https://frizzlife.com/products/pd800-n', stores)?.slug, 'frizzlife')
})

test('shop la / URL rac / undefined -> null, KHONG doan bua', () => {
  assert.equal(matchStoreByUrl('https://hovsco.com/teelacodes', stores), null)
  assert.equal(matchStoreByUrl('khong-phai-url', stores), null)
  assert.equal(matchStoreByUrl(undefined, stores), null)
})

// ── Gan lien ket tiep thi vao dealUrl ────────────────────────────
test('link tran cua shop da biet -> gan ref cua dung shop do', () => {
  assert.equal(
    applyStoreRefToDealUrl('https://kyokuknives.com/products/santoku', stores),
    'https://kyokuknives.com/products/santoku?ref=offerdy'
  )
})

test('mang theo MOI tham so cua shop, khong chi ref', () => {
  const out = new URL(applyStoreRefToDealUrl('https://www.frizzlife.com/products/pd800-n', stores)!)
  assert.equal(out.searchParams.get('ref'), 'offerdy')
  assert.equal(out.searchParams.get('utm_source'), 'affiliate')
})

test('link da co ref san -> giu nguyen; shop la -> giu nguyen', () => {
  assert.equal(
    applyStoreRefToDealUrl('https://kyokuknives.com/p/x?ref=daco', stores),
    'https://kyokuknives.com/p/x?ref=daco'
  )
  assert.equal(
    applyStoreRefToDealUrl('https://hovsco.com/teelacodes', stores),
    'https://hovsco.com/teelacodes'
  )
})

test('store khong co affiliateLink -> giu nguyen URL', () => {
  assert.equal(
    applyStoreRefToDealUrl('https://pupino.pl/product/x', [{ ...stores[2], affiliateLink: undefined }]),
    'https://pupino.pl/product/x'
  )
})

test('giu query va fragment san co', () => {
  const out = applyStoreRefToDealUrl('https://kyokuknives.com/p/x?variant=42#reviews', stores)!
  assert.match(out, /variant=42/)
  assert.match(out, /ref=offerdy/)
  assert.match(out, /#reviews$/)
})

test('undefined -> undefined, khong nem loi', () => {
  assert.equal(applyStoreRefToDealUrl(undefined, stores), undefined)
})

// ── Link nam TRONG than bai (HTML da luu) ────────────────────────
test('nut CTA giua bai review duoc gan ref, khong chi nut dau trang', () => {
  const html = '<p>x</p><a class="article-cta" href="https://kyokuknives.com/p/santoku" target="_blank">Check the best price →</a>'
  assert.match(
    applyStoreRefToHtmlLinks(html, stores)!,
    /href="https:\/\/kyokuknives\.com\/p\/santoku\?ref=offerdy"/
  )
})

test('gan cho MOI link trong bai, ke ca link boc quanh anh', () => {
  const html = '<figure><a href="https://kyokuknives.com/p/x"><img src="https://cdn.sanity.io/a.jpg" /></a></figure>'
    + "<a href='https://kyokuknives.com/p/y'>mua</a>"
  const out = applyStoreRefToHtmlLinks(html, stores)!
  assert.match(out, /href="https:\/\/kyokuknives\.com\/p\/x\?ref=offerdy"/)
  assert.match(out, /href='https:\/\/kyokuknives\.com\/p\/y\?ref=offerdy'/)
  // src cua anh khong bi dong vao: gan ref vao URL anh vua vo nghia vua de lam hong
  assert.match(out, /src="https:\/\/cdn\.sanity\.io\/a\.jpg"/)
})

test('nhieu tham so -> escape & thanh &amp; trong HTML', () => {
  const out = applyStoreRefToHtmlLinks('<a href="https://www.frizzlife.com/products/px600">mua</a>', stores)!
  assert.match(out, /href="https:\/\/www\.frizzlife\.com\/products\/px600\?ref=offerdy&amp;utm_source=affiliate"/)
})

test('href da escape san -> doc dung tham so, khong nhan "amp;" la ten tham so', () => {
  const html = '<a href="https://www.frizzlife.com/products/px600?ref=daco&amp;utm_source=affiliate">mua</a>'
  const out = applyStoreRefToHtmlLinks(html, stores)!
  assert.equal(out, html) // da du tham so -> khong doi gi
})

test('link noi bo va shop la -> giu nguyen, khong dung toi', () => {
  const html = '<a href="/deals">deals</a><a href="https://hovsco.com/x">shop la</a>'
  assert.equal(applyStoreRefToHtmlLinks(html, stores), html)
})

test('than bai trong -> tra ve nguyen ban, khong nem loi', () => {
  assert.equal(applyStoreRefToHtmlLinks(undefined, stores), undefined)
  assert.equal(applyStoreRefToHtmlLinks('', stores), '')
})

// ── Dien ten shop khi deal de trong ──────────────────────────────
test('resolveDealLink tra ve ca URL da gan ref va TEN SHOP', () => {
  const r = resolveDealLink('https://kyokuknives.com/products/santoku', stores)
  assert.equal(r.dealUrl, 'https://kyokuknives.com/products/santoku?ref=offerdy')
  assert.equal(r.storeName, 'Kyokuknives')
})

test('resolveDealLink: shop la -> khong co ten shop (khong bia)', () => {
  const r = resolveDealLink('https://hovsco.com/teelacodes', stores)
  assert.equal(r.storeName, undefined)
  assert.equal(r.dealUrl, 'https://hovsco.com/teelacodes')
})

// ── Ma coupon cho deal ───────────────────────────────────────────
test('shop co ma -> tra ma + ten store + cau mo ta', () => {
  const c = couponForDealUrl('https://kyokuknives.com/products/santoku', stores)
  assert.equal(c?.code, 'OFFERDY')
  assert.equal(c?.storeName, 'Kyokuknives')
  assert.equal(c?.offerText, '10% off your order')
})

test('shop KHONG co ma -> null (khong hien hop coupon rong)', () => {
  assert.equal(couponForDealUrl('https://pupino.pl/?ref=offerdy', stores), null)
})

test('shop khong khop -> null', () => {
  assert.equal(couponForDealUrl('https://amazon.com/dp/B01', stores), null)
})

// ── Deal thuộc về store nào (trang /stores/[slug]) ───────────────
//
// ⚠️ Bốn ca đầu là dữ liệu THẬT trên production ngày 2026-08-10, không phải
// fixture tự dựng. Phép khớp cũ — `deal.store.includes(store.name)` — làm
// **85/175 deal vô hình** trên chính trang store của chúng. Fixture tự dựng cho
// qua hết; chỉ tên thật mới lộ ra lỗi.

test('⚠️ deal.store là TÊN MIỀN còn store.name có dấu cách — 35 deal từng biến mất', () => {
  const store = { name: 'Cloud Cushion Slides', affiliateLink: 'https://cloudcushionslides.com/?ref=offerdy' }
  const deal = { store: 'cloudcushionslides.com', dealUrl: 'https://cloudcushionslides.com/products/x' }
  // Phép cũ: "cloudcushionslides.com".includes("cloud cushion slides") === false
  assert.equal(deal.store.toLowerCase().includes(store.name.toLowerCase()), false)
  assert.equal(dealBelongsToStore(deal, store), true)
})

test('⚠️ deal.store ngắn hơn store.name — 22 deal Dowinx từng biến mất', () => {
  const store = { name: 'dowinx-gaming-chair.EU', affiliateLink: 'https://eu.dowinx.com/?ref=offerdy' }
  const deal = { store: 'Dowinx', dealUrl: 'https://eu.dowinx.com/products/chair' }
  assert.equal(deal.store.toLowerCase().includes(store.name.toLowerCase()), false)
  assert.equal(dealBelongsToStore(deal, store), true)
})

test('ca duy nhất phép cũ chạy đúng vẫn phải chạy đúng — tên viết liền', () => {
  const store = { name: 'WoWGadgets99', affiliateLink: 'https://wowgadgets99.com/?ref=offerdy' }
  const deal = { store: 'wowgadgets99.com', dealUrl: 'https://wowgadgets99.com/products/y' }
  assert.equal(dealBelongsToStore(deal, store), true)
})

test('deal của shop KHÁC không được lọt sang — hậu quả nặng hơn cả việc mất deal', () => {
  const store = { name: 'Cloud Cushion Slides', affiliateLink: 'https://cloudcushionslides.com/?ref=offerdy' }
  const deal = { store: 'Cloud Cushion Slides', dealUrl: 'https://kyokuknives.com/products/santoku' }
  // Chuỗi khớp hoàn hảo, nhưng URL trỏ shop khác. Domain thắng — nếu không,
  // khách bấm deal ở trang shop A và bị đưa sang shop B.
  assert.equal(dealBelongsToStore(deal, store), false)
})

test('www. và tham số ref không được làm lệch phép khớp', () => {
  const store = { name: 'Estarer', website: 'estarer.com' }
  assert.equal(
    dealBelongsToStore({ dealUrl: 'https://www.estarer.com/p/1?ref=offerdy&utm_source=affiliate' }, store),
    true
  )
})

test('khớp cả website lẫn affiliateLink — hai field không luôn cùng host', () => {
  const store = { name: 'X', website: 'https://x-shop.com', affiliateLink: 'https://go.partner.com/x' }
  assert.equal(dealBelongsToStore({ dealUrl: 'https://x-shop.com/p' }, store), true)
  assert.equal(dealBelongsToStore({ dealUrl: 'https://go.partner.com/x/p' }, store), true)
})

test('không có dealUrl -> quay về khớp chuỗi (đường lùi, không phải đường chính)', () => {
  const store = { name: 'Hunny Life', website: 'hunnylife.com' }
  assert.equal(dealBelongsToStore({ store: 'Hunny Life' }, store), true)
  assert.equal(dealBelongsToStore({ store: 'Shop khac' }, store), false)
  assert.equal(dealBelongsToStore({}, store), false)
})

test('store chưa khai website lẫn affiliateLink -> không khớp bừa', () => {
  assert.equal(dealBelongsToStore({ dealUrl: 'https://bat-ky-dau.com/p' }, { name: 'Store Trong' }), false)
})

// ── Tên shop hiện cho khách ──────────────────────────────────────
//
// ⚠️ 87 deal trên production có `deal.store` là một tên miền trần. Nó đi ra HAI
// chỗ người ngoài nhìn thấy: thẻ shop dưới tiêu đề deal, và `brand.name` trong
// JSON-LD gửi Google — tức khai với Google rằng thương hiệu tên là
// "cloudcushionslides.com".

test('⚠️ tên miền trần bị thay bằng tên store thật — ca đã hiện ra trước mặt khách', () => {
  assert.equal(
    displayStoreName('cloudcushionslides.com', 'https://cloudcushionslides.com/products/x', 'Cloud Cushion Slides'),
    'Cloud Cushion Slides'
  )
})

test('⚠️ "Dowinx" KHÔNG được coi là tên miền — new URL("https://Dowinx") vẫn parse được', () => {
  // Không có chặn "phải có dấu chấm" thì một tên thương hiệu thật bị thay oan.
  assert.equal(
    displayStoreName('Dowinx', 'https://eu.dowinx.com/p', 'dowinx-gaming-chair.EU'),
    'Dowinx'
  )
})

test('tên người vận hành gõ luôn được giữ', () => {
  assert.equal(
    displayStoreName('Bag Organizers Shop', 'https://bagorganizers.shop/p', 'Bag Organizers Shop'),
    'Bag Organizers Shop'
  )
  assert.equal(
    displayStoreName('Tên Tiếng Việt', 'https://x.com/p', 'X Store'),
    'Tên Tiếng Việt'
  )
})

test('tên miền TRỎ SHOP KHÁC thì giữ nguyên, không thay bừa', () => {
  assert.equal(
    displayStoreName('shopkhac.com', 'https://cloudcushionslides.com/p', 'Cloud Cushion Slides'),
    'shopkhac.com'
  )
})

test('deal.store trống -> lấy tên suy ra được (hành vi cũ, không được mất)', () => {
  assert.equal(displayStoreName(undefined, 'https://x.com/p', 'X Store'), 'X Store')
  assert.equal(displayStoreName('', 'https://x.com/p', 'X Store'), 'X Store')
  assert.equal(displayStoreName('   ', 'https://x.com/p', 'X Store'), 'X Store')
})

test('không suy ra được store -> giữ nguyên chuỗi, kể cả khi nó là tên miền', () => {
  assert.equal(displayStoreName('lashop.com', 'https://lashop.com/p', undefined), 'lashop.com')
  assert.equal(displayStoreName(undefined, 'https://lashop.com/p', undefined), undefined)
})
