/**
 * Hang rao dau ra cua AI caption — lop bao ve doc lap voi prompt.
 *
 * Day la phan an toan nhat trong du an can test: prompt la loi khuyen, model co the
 * phot lo, con nhung kiem tra nay thi khong. Moi ca duoi day tuong ung mot loi da
 * THUC SU xay ra khi chay that voi Anthropic.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPTION_PLATFORMS, findUnsafeText, fillPlaceholders, platformById, type CaptionDealInput,
} from '@/lib/ai/generateCaption'

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

test('🚨 {coupon} phải mang theo MỨC GIẢM, không chỉ mã trần', () => {
  // Caption viết "use OFFERDY at checkout" không nói được mã giảm bao nhiêu, nên
  // người đọc không biết có đáng gõ hay không. Mức giảm do CODE chèn từ `offerText`
  // thật — không bao giờ để model viết một con số ra.
  // Bỏ sót đúng chỗ này ở social-kit/actions.ts cho tới 28/08/2026: nó chỉ chép
  // `coupon?.code` mà quên `coupon?.offerText`.
  const co = { ...deal, couponCode: 'OFFERDY', couponOfferText: '5% Off' }
  assert.equal(
    fillPlaceholders('code {coupon} at checkout', co, { style: 'deal' }),
    'code OFFERDY (5% off) at checkout'
  )

  // Số tiền cố định cũng đọc được, không riêng phần trăm.
  const tien = { ...deal, couponCode: 'SAVE10', couponOfferText: '$10 Off' }
  assert.match(fillPlaceholders('{coupon}', tien, { style: 'deal' }), /SAVE10 \(\$10 off\)/)
})

test('⚠️ đọc không ra mức giảm -> chỉ hiện mã, KHÔNG bịa số', () => {
  // `offerText` mơ hồ, hoặc trống, hoặc một con số vô lý do lỗi nhập liệu.
  for (const text of [undefined, '', 'Exclusive offer', 'Free shipping', '150% Off']) {
    const out = fillPlaceholders('{coupon}', { ...deal, couponCode: 'OFFERDY', couponOfferText: text }, { style: 'deal' })
    assert.equal(out, 'OFFERDY', `offerText ${JSON.stringify(text)} phải cho ra mã trần, ra: ${out}`)
  }
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

// ── Trần hashtag từng nền tảng ────────────────────────────────────
test('🚨 mỗi nền tảng có trần hashtag, và con số trong brief phải khớp trần đó', () => {
  // Trần thật do `maxHashtags` quyết định (cắt bằng code khi dựng biến thể).
  // `brief` chỉ là lời dặn model. Hai chỗ lệch nhau thì model được dặn một đằng
  // còn caption bị cắt một nẻo — và người vận hành không hiểu vì sao mất hashtag.
  for (const p of CAPTION_PLATFORMS) {
    assert.ok(p.maxHashtags >= 1, `${p.id} không có trần hashtag`)
    const so = p.brief.match(/(\d+)\s+hashtags?/)
    assert.ok(so, `brief của ${p.id} không nêu số hashtag`)
    assert.equal(
      Number(so[1]), p.maxHashtags,
      `${p.id}: brief nói ${so[1]} nhưng maxHashtags là ${p.maxHashtags}`
    )
  }
})

test('Instagram tối đa 4 hashtag — con số người vận hành chốt', () => {
  assert.equal(platformById('instagram').maxHashtags, 4)
  // Threads/X chỉ 2: schema phải cho phép ít tới mức đó, nếu không model bị ép
  // vi phạm một trong hai luật.
  assert.equal(platformById('threads').maxHashtags, 2)
})
