/**
 * Hang rao dau ra cua AI caption — lop bao ve doc lap voi prompt.
 *
 * Day la phan an toan nhat trong du an can test: prompt la loi khuyen, model co the
 * phot lo, con nhung kiem tra nay thi khong. Moi ca duoi day tuong ung mot loi da
 * THUC SU xay ra khi chay that voi Anthropic.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findUnsafeText, fillPlaceholders, type CaptionDealInput } from '@/lib/ai/generateCaption'

const deal: CaptionDealInput = {
  code: 1020, title: 'Santoku Knife',
  priceSale: '$48', priceOrig: '$60', discount: 20,
  couponCode: 'OFFERDY',
}

test('chan AI tu viet so tien / phan tram', () => {
  assert.match(findUnsafeText('save $20 today', 'instagram', { hasCoupon: true }) ?? '', /tự viết số tiền/)
  assert.match(findUnsafeText('50% off now', 'instagram', { hasCoupon: true }) ?? '', /tự viết số tiền/)
})

test('chan cho trong khong hop le', () => {
  assert.match(findUnsafeText('hurry {deadline}', 'instagram') ?? '', /không hợp lệ/)
})

test('chan link trong caption Instagram/TikTok (link o do khong bam duoc)', () => {
  assert.match(
    findUnsafeText('see {link} and use {coupon}', 'instagram', { hasCoupon: true }) ?? '',
    /link ở đó không bấm được/
  )
})

test('{coupon} bi tu choi khi shop khong co ma', () => {
  assert.match(findUnsafeText('Grab it with {coupon}', 'instagram', { hasCoupon: false }) ?? '', /không có mã coupon/)
  // Khong truyen opts -> mac dinh coi nhu KHONG co ma (an toan mac dinh)
  assert.match(findUnsafeText('use {coupon}', 'instagram') ?? '', /không có mã coupon/)
})

test('LOI THAT: noi ve ma giam gia nhung khong dua ma -> tu choi', () => {
  // Model that su da viet cau nay: bao khach co ma roi giu ma lai.
  assert.match(
    findUnsafeText("There's also a store-wide code at checkout if you want to check it out.", 'instagram', { hasCoupon: true }) ?? '',
    /không đưa \{coupon\}/
  )
  assert.match(
    findUnsafeText('A store-wide coupon code is live for browsers', 'instagram', { hasCoupon: true }) ?? '',
    /không đưa \{coupon\}/
  )
})

test('caption hop le di qua duoc', () => {
  assert.equal(
    findUnsafeText('Bio link has it, search {code}. Checkout takes {coupon}.', 'instagram', { hasCoupon: true }),
    null
  )
  // Khong nhac gi ve ma -> khong bi ep phai co {coupon}
  assert.equal(findUnsafeText('Just {price} today, search {code}', 'instagram', { hasCoupon: true }), null)
})

test('{coupon} va {code} la HAI thu khac nhau khi dien', () => {
  assert.equal(
    fillPlaceholders('Product {code} · code {coupon} · {price}', deal, { style: 'deal' }),
    'Product #1020 · code OFFERDY · $48'
  )
})

test('khong co ma -> {coupon} thanh chuoi rong, khong lo dau ngoac', () => {
  const out = fillPlaceholders('code {coupon} here', { ...deal, couponCode: undefined }, { style: 'deal' })
  assert.equal(out.includes('{coupon}'), false)
})

test('don dau $ bi nhan doi va "OFF off" (loi model hay mac)', () => {
  // `$${price}` -> phai ra mot dau $, ke ca chuoi dai hon mot cap
  assert.equal(fillPlaceholders('only $${price}', deal, { style: 'deal' }), 'only $48')
  assert.equal(fillPlaceholders('{discount} off now', deal, { style: 'deal' }), '20% OFF now')
})
