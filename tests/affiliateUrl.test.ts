/**
 * URL affiliate cho offer: gan ma ref cua shop, thu tu uu tien, van an toan.
 *
 * Chay bang `npm test` (Node tu doc TypeScript, khong can build). Cac gia tri shop
 * trong file nay lay tu production that 2026-07-26 — dac biet la BA ma ref khac
 * nhau, vi day chinh la thu de bi hardcode sai nhat.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveOfferUrl, applyTrackingParams, trackingParams, validateProductUrl,
} from '@/lib/affiliateUrl'

const consistentderma = {
  affiliateLink: 'https://consistentderma.com/?ref=offerdy',
  website: 'https://consistentderma.com',
}
const pawsatpeace = {
  affiliateLink: 'https://pawsatpeace.store/?ref=xyupasuk',
  website: 'https://pawsatpeace.store',
}
const noAffiliate = { website: 'cycleaddons.com' }

test('trackingParams: lay dung ma ref cua tung shop', () => {
  assert.deepEqual(trackingParams(consistentderma.affiliateLink), [['ref', 'offerdy']])
  assert.deepEqual(trackingParams(pawsatpeace.affiliateLink), [['ref', 'xyupasuk']])
})

test('trackingParams: khong co query / rac / undefined -> mang rong', () => {
  assert.deepEqual(trackingParams('https://shop.com'), [])
  assert.deepEqual(trackingParams('khong-phai-url'), [])
  assert.deepEqual(trackingParams(undefined), [])
})

test('trackingParams: mang theo MOI tham so, khong chi ref', () => {
  assert.deepEqual(
    trackingParams('https://s.com/?ref=a&utm_source=offerdy'),
    [['ref', 'a'], ['utm_source', 'offerdy']]
  )
})

test('applyTrackingParams: gan ref DUNG cua tung shop, khong hardcode "offerdy"', () => {
  assert.equal(
    applyTrackingParams('https://consistentderma.com/products/face-wash', consistentderma),
    'https://consistentderma.com/products/face-wash?ref=offerdy'
  )
  assert.equal(
    applyTrackingParams('https://pawsatpeace.store/products/dog-bed', pawsatpeace),
    'https://pawsatpeace.store/products/dog-bed?ref=xyupasuk'
  )
})

test('applyTrackingParams: URL da co ref -> giu nguyen, khong ghi de', () => {
  assert.equal(
    applyTrackingParams('https://consistentderma.com/p/x?ref=daco', consistentderma),
    'https://consistentderma.com/p/x?ref=daco'
  )
})

test('applyTrackingParams: giu query san co, noi them ref, giu fragment', () => {
  const out = new URL(applyTrackingParams('https://consistentderma.com/p/x?variant=42', consistentderma))
  assert.equal(out.searchParams.get('variant'), '42')
  assert.equal(out.searchParams.get('ref'), 'offerdy')
  assert.equal(
    applyTrackingParams('https://consistentderma.com/p/x#reviews', consistentderma),
    'https://consistentderma.com/p/x?ref=offerdy#reviews'
  )
})

test('applyTrackingParams: www. khong lam lech phep so host', () => {
  assert.equal(
    applyTrackingParams('https://www.consistentderma.com/p/x', consistentderma),
    'https://www.consistentderma.com/p/x?ref=offerdy'
  )
})

test('applyTrackingParams: KHAC domain -> khong gan (ref shop A vo nghia tren shop B)', () => {
  assert.equal(
    applyTrackingParams('https://amazon.com/dp/B01', consistentderma),
    'https://amazon.com/dp/B01'
  )
})

test('applyTrackingParams: store khong co affiliateLink -> giu nguyen', () => {
  assert.equal(
    applyTrackingParams('https://cycleaddons.com/p/bike', noAffiliate),
    'https://cycleaddons.com/p/bike'
  )
})

test('resolveOfferUrl: thu tu uu tien productUrl > link offer > store > website > #', () => {
  assert.equal(
    resolveOfferUrl({ productUrl: 'https://consistentderma.com/products/face-wash', link: consistentderma.affiliateLink }, consistentderma),
    'https://consistentderma.com/products/face-wash?ref=offerdy'
  )
  assert.equal(
    resolveOfferUrl({ link: consistentderma.affiliateLink }, consistentderma),
    'https://consistentderma.com/?ref=offerdy'
  )
  assert.equal(resolveOfferUrl({}, consistentderma), 'https://consistentderma.com/?ref=offerdy')
  assert.equal(resolveOfferUrl({}, noAffiliate), 'https://cycleaddons.com')
  assert.equal(resolveOfferUrl({}, {}), '#')
})

test('resolveOfferUrl: productUrl rac/rong -> lui ve link offer, khong tra link hong', () => {
  assert.equal(
    resolveOfferUrl({ productUrl: 'ban oi day khong phai url', link: consistentderma.affiliateLink }, consistentderma),
    'https://consistentderma.com/?ref=offerdy'
  )
  assert.equal(resolveOfferUrl({ productUrl: '   ', link: 'https://x.com/' }, {}), 'https://x.com/')
})

test('resolveOfferUrl: chan scheme la (javascript:)', () => {
  assert.equal(
    resolveOfferUrl({ productUrl: 'javascript:alert(1)', link: 'https://shop.com/' }, {}),
    'https://shop.com/'
  )
})

// ── Van an toan khi trang san pham chet ──────────────────────────
// Kiem tra link ghi 'broken' -> lui ve link shop thay vi dua khach toi 404.
test('van an toan: linkStatus broken + co productUrl -> lui ve link shop', () => {
  assert.equal(
    resolveOfferUrl(
      { productUrl: 'https://consistentderma.com/products/da-go', link: consistentderma.affiliateLink, linkStatus: 'broken' },
      consistentderma
    ),
    'https://consistentderma.com/?ref=offerdy'
  )
})

test('van an toan: ok / unchecked van dung trang san pham (chua kiem != hong)', () => {
  for (const linkStatus of ['ok', 'unchecked'] as const) {
    assert.equal(
      resolveOfferUrl(
        { productUrl: 'https://consistentderma.com/p/x', link: consistentderma.affiliateLink, linkStatus },
        consistentderma
      ),
      'https://consistentderma.com/p/x?ref=offerdy',
      `linkStatus=${linkStatus}`
    )
  }
})

test('van an toan: broken ma KHONG co productUrl -> giu nguyen hanh vi cu', () => {
  assert.equal(
    resolveOfferUrl({ link: consistentderma.affiliateLink, linkStatus: 'broken' }, consistentderma),
    'https://consistentderma.com/?ref=offerdy'
  )
})

test('validateProductUrl: hop le / sai dinh dang / khac domain / website tran', () => {
  const good = validateProductUrl(' https://consistentderma.com/p/x ', consistentderma)
  assert.equal(good.ok, true)
  assert.equal(good.ok && good.value, 'https://consistentderma.com/p/x')
  assert.equal(good.ok && good.warning, undefined)

  const bad = validateProductUrl('shop.com/san-pham', consistentderma)
  assert.equal(bad.ok, false)
  assert.match(!bad.ok ? bad.error : '', /URL http/)

  const wrongShop = validateProductUrl('https://pawsatpeace.store/p/x', consistentderma)
  assert.equal(wrongShop.ok, true)
  assert.match(wrongShop.ok ? wrongShop.warning ?? '' : '', /khac domain/)

  const bareWebsite = validateProductUrl('https://cycleaddons.com/p/bike', noAffiliate)
  assert.equal(bareWebsite.ok, true)
  assert.equal(bareWebsite.ok && bareWebsite.warning, undefined)
})
