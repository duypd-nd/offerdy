/**
 * Thay the vuong luc goi trang.
 *
 * Ca dat cuoc nang nhat: **ma giam het han sau khi bai da dang**. Prompt khong the lo
 * duoc chuyen do — luc viet bai ma con song. Chi render moi lo duoc, va cach lo dung
 * la go CA CAU chu khong chi go token: *"dung ma  khi thanh toan"* te hon im lang.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderPostTokens, renderCouponToken, renderPriceTokens, remainingTokens,
  formatPrice, priceNote, type RenderProduct,
} from '@/lib/postRender'

const products: RenderProduct[] = [
  {
    url: 'https://www.frizzlife.com/products/pd400',
    title: 'Frizzlife PD400',
    imageUrl: 'https://cdn.shopify.com/pd400.png',
    priceAtWriting: '298.75',
    currency: 'USD',
    capturedAt: '2026-08-05T03:38:41.015Z',
  },
  {
    url: 'https://www.frizzlife.com/products/pd600-tam3',
    title: 'Frizzlife PD600-TAM3',
    priceAtWriting: '469.99',
    currency: 'USD',
    capturedAt: '2026-08-05T03:38:41.015Z',
  },
]

test('gia: ghep ky hieu tien te, khong ghep hai lan', () => {
  assert.equal(formatPrice('298.75', 'USD'), '$298.75')
  assert.equal(formatPrice('$298.75', 'USD'), '$298.75')
  assert.equal(formatPrice('298.75'), '298.75')
  // Khong biet ky hieu -> ghi MA tien te, KHONG mac dinh thanh $.
  assert.equal(formatPrice('50000', 'IDR'), '50000 IDR')
  assert.equal(formatPrice(undefined, 'USD'), null)
})

test('⚠️ ma giam het han -> go CA CAU, khong chi go token', () => {
  const html = '<p>Intro.</p><p>Use code [COUPON] at checkout.</p><p>Outro.</p>'
  const gone = renderCouponToken(html, null)
  assert.ok(!gone.includes('[COUPON]'))
  assert.ok(!gone.includes('at checkout'), 'câu nhắc mã phải biến mất cùng token: ' + gone)
  assert.ok(gone.includes('Intro.') && gone.includes('Outro.'), 'chỉ gỡ đúng câu đó')
})

test('con ma thi hien ma that', () => {
  const out = renderCouponToken('<p>Use [COUPON] now.</p>', { code: 'OFFERDY' })
  assert.match(out, /OFFERDY/)
  assert.ok(!out.includes('[COUPON]'))
})

test('token nam ngoai the khoi van bi go sach', () => {
  assert.ok(!renderCouponToken('Use [COUPON] now', null).includes('[COUPON]'))
})

test('go the boc dang <li> chu khong nuot ca danh sach', () => {
  const html = '<ul><li>Free shipping</li><li>Code [COUPON]</li><li>Fast support</li></ul>'
  const out = renderCouponToken(html, null)
  assert.ok(out.includes('Free shipping') && out.includes('Fast support'))
  assert.ok(!out.includes('[COUPON]') && !out.includes('Code'))
})

test('[PRICE:n] lay gia luc viet, [WAS:n] khong co nguon thi bien mat', () => {
  const out = renderPriceTokens('<p>Now [PRICE:1], was [WAS:1].</p>', products)
  assert.match(out, /\$298\.75/)
  assert.ok(!out.includes('[WAS:1]'))
})

test('san pham khong co gia -> token bien mat, khong de lai chuoi rac', () => {
  const noPrice = [{ url: 'https://x.com/a', title: 'A' }]
  const out = renderPriceTokens('<p>Costs [PRICE:1].</p>', noPrice)
  assert.ok(!out.includes('[PRICE:1]'))
  assert.equal(out, '<p>Costs .</p>')
})

test('[CTA:n] ra link co nofollow sponsored — va KHONG tu gan ma ref', () => {
  const out = renderPostTokens('<p>[CTA:1]</p>', { products, storeName: 'Frizzlife' })
  assert.match(out, /rel="nofollow sponsored noopener"/)
  assert.match(out, /href="https:\/\/www\.frizzlife\.com\/products\/pd400"/)
  // Ref do `getStoreRefForHtml` gan sau, o mot cho duy nhat. Gan hai noi la co hai
  // cho de lech.
  // ⚠️ Kiem `?ref=`/`&ref=` chu khong phai chuoi con `ref=`: `href=` cung chua no.
  assert.ok(!/[?&]ref=/.test(out))
})

test('[IMAGE:n] cho san pham khong co anh -> bien mat chu khong ra the <img> hong', () => {
  const out = renderPostTokens('<p>[IMAGE:2]</p>', { products })
  assert.ok(!out.includes('<img'))
  assert.ok(!out.includes('[IMAGE:2]'))
})

test('[TABLE] dung kieu bang chung cua globals.css', () => {
  const out = renderPostTokens('<p>x</p>[TABLE]', {
    products,
    comparisonRows: [{ label: 'Flow rate', values: ['400 GPD', '600 GPD'] }],
  })
  assert.match(out, /class="article-table-wrap"/)
  assert.match(out, /<th scope="row">Flow rate<\/th>/)
  assert.match(out, /<td>400 GPD<\/td><td>600 GPD<\/td>/)
  // Khong nhoi <style> vao tung bai.
  assert.ok(!out.includes('<style'))
})

test('khong co bang thi [TABLE] bien mat', () => {
  const out = renderPostTokens('<p>x</p>[TABLE]', { products })
  assert.ok(!out.includes('[TABLE]'))
  assert.ok(!out.includes('<table'))
})

test('⚠️ sau khi render KHONG con the nao lot ra mat nguoi doc', () => {
  const html =
    '<h2>Choice</h2><p>[PRODUCT:1] vs [PRODUCT:2]. [IMAGE:1]</p>[TABLE]' +
    '<p>Buy [CTA:1] at [PRICE:1] or [CTA:2] at [PRICE:2].</p><p>Code [COUPON].</p>'
  const out = renderPostTokens(html, {
    products,
    storeName: 'Frizzlife',
    comparisonRows: [{ label: 'Flow rate', values: ['400 GPD', '600 GPD'] }],
    coupon: { code: 'OFFERDY' },
  })
  assert.deepEqual(remainingTokens(out), [])
  assert.match(out, /Frizzlife PD400/)
})

test('ca khi thieu het du lieu, van khong the nao sot lai', () => {
  const html = '<p>[PRODUCT:9] [IMAGE:9] [CTA:9] [PRICE:9] [WAS:9] [TABLE] [COUPON]</p>'
  assert.deepEqual(remainingTokens(renderPostTokens(html, { products: [] })), [])
})

test('chu khong bi coi la the HTML — noi dung shop duoc thoat ky tu', () => {
  const nasty: RenderProduct[] = [{ url: 'https://x.com/a', title: '<script>alert(1)</script>' }]
  const out = renderPostTokens('<p>[PRODUCT:1]</p>', { products: nasty })
  assert.ok(!out.includes('<script>'))
  assert.match(out, /&lt;script&gt;/)
})

test('dong "gia tai thoi diem viet" chi hien khi that su co gia', () => {
  assert.match(priceNote(products) ?? '', /captured on 2026-08-05/)
  assert.equal(priceNote([{ url: 'https://x.com/a', title: 'A', capturedAt: '2026-08-05T00:00:00Z' }]), null)
  assert.equal(priceNote([]), null)
})
