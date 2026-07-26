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
