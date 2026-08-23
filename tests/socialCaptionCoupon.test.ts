/**
 * Dòng mã giảm giá trong caption của `/admin/social-kit`.
 *
 * ⚠️ Đây là chữ **đăng công khai** kèm một con số. Phép kiểm quan trọng nhất
 * không phải "câu chữ đẹp", mà là **không hứa điều mình không giữ được**: đây là
 * mã của CẢ SHOP, không phải mã riêng cho sản phẩm, và nhiều shop loại trừ hàng
 * đang sale khỏi mã. Mô tả cái mã thì được; hứa khách sẽ được giảm thêm thì không.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCaption, couponLine, type CaptionDeal } from '../src/lib/socialCaption'

const DEAL: CaptionDeal = {
  code: 1471,
  title: 'EverTote Expandable Mama Tote Bag',
  priceSale: '$89.95',
  priceOrig: '$129.95',
  discount: 31,
  slug: 'evertote-expandable-mama-tote-bag',
}

test('có mã và đọc được mức giảm: hiện cả hai', () => {
  const d = { ...DEAL, couponCode: 'OFFERDY', couponOfferText: '5% Off' }
  assert.equal(couponLine(d), 'Store code: OFFERDY (5% off) — worth trying at checkout')

  const cap = buildCaption(d, { style: 'deal' })
  assert.match(cap, /Store code: OFFERDY \(5% off\)/)
  // Dòng mã phải nằm SAU dòng giá và TRƯỚC dòng link — đọc theo thứ tự bán hàng.
  assert.ok(cap.indexOf('$89.95') < cap.indexOf('Store code'), cap)
  assert.ok(cap.indexOf('Store code') < cap.indexOf('full details'), cap)
})

test('có mã nhưng KHÔNG đọc được mức giảm: chỉ hiện mã, không bịa số', () => {
  for (const text of [undefined, '', 'Free Shipping', 'Exclusive offer']) {
    const d = { ...DEAL, couponCode: 'OFFERDY', couponOfferText: text }
    assert.equal(couponLine(d), 'Store code: OFFERDY — worth trying at checkout', String(text))
    // ⚠️ Không một con số phần trăm nào được xuất hiện từ hư không.
    assert.ok(!/\(\d/.test(couponLine(d)), couponLine(d))
  }
})

test('KHÔNG có mã thì caption giữ NGUYÊN như trước', () => {
  assert.equal(couponLine(DEAL), '')
  const cap = buildCaption(DEAL, { style: 'deal' })
  assert.ok(!/Store code/.test(cap), cap)
  // Đường cũ không đổi một chữ: vẫn tiêu đề → giá → link → hashtag.
  assert.match(cap, /^EverTote Expandable Mama Tote Bag\n\n\$89\.95 \(was \$129\.95\)/)
})

test('mã toàn khoảng trắng coi như không có', () => {
  assert.equal(couponLine({ ...DEAL, couponCode: '   ' }), '')
  assert.equal(couponLine({ ...DEAL, couponCode: '' }), '')
})

test('TUYỆT ĐỐI không hứa cộng dồn', () => {
  // ⚠️ "use X for an extra 5% off" là một lời hứa ta không giữ được — nhiều shop
  // loại trừ hàng đang sale khỏi mã. Một mã không áp được ở bước thanh toán làm
  // mất lòng tin nhiều hơn là không hiện mã nào.
  for (const text of ['5% Off', '€10 Off', undefined]) {
    const l = couponLine({ ...DEAL, couponCode: 'OFFERDY', couponOfferText: text })
    assert.ok(!/extra|additional|stack|on top|combine/i.test(l), l)
    assert.match(l, /worth trying at checkout/)
  }
})

test('số tiền cố định đọc đúng ký hiệu, không hoá thành phần trăm', () => {
  const l = couponLine({ ...DEAL, couponCode: 'OFFERDY', couponOfferText: '€10 Off' })
  assert.equal(l, 'Store code: OFFERDY (€10 off) — worth trying at checkout')
})

test('mức giảm vô lý bị chặn, caption chỉ còn mã', () => {
  // 150% Off là lỗi nhập; lọt lên caption là một lời hứa không ai giữ được.
  const l = couponLine({ ...DEAL, couponCode: 'OFFERDY', couponOfferText: '150% Off' })
  assert.equal(l, 'Store code: OFFERDY — worth trying at checkout')
})
