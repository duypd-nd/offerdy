/**
 * Nhãn giảm giá trên thẻ deal, ảnh Open Graph và caption mạng xã hội.
 *
 * Đây là chỗ một con số đọc sai thôi nằm im trong ô admin và trở thành **lời hứa
 * công khai**. Ca đã xảy ra thật: deal €199,99 → €149,99 in ra "Save €5000".
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'

const base = { discount: 25, discountByAmount: true }

test('⚠️ giá kiểu châu Âu: €199,99 → €149,99 là Save €50, KHÔNG phải €5000', () => {
  const badge = dealDiscountBadge({ ...base, priceOrig: '€199,99', priceSale: '€149,99' })
  assert.equal(badge.main, 'Save €50')
  assert.equal(badge.sub, null)
})

test('⚠️ giữ đúng ký hiệu tiền tệ của chính deal, không quy về $', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '₫250.000', priceSale: '₫200.000' }).main, 'Save ₫50000')
  assert.equal(dealDiscountBadge({ ...base, priceOrig: 'Rp4.961.899', priceSale: 'Rp3.961.899' }).main, 'Save Rp1000000')
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '£60', priceSale: '£48' }).main, 'Save £12')
})

test('giá kiểu Mỹ vẫn đúng như trước', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '$1,299.99', priceSale: '$999.99' }).main, 'Save $300')
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '$60', priceSale: '$48' }).main, 'Save $12')
})

test('⚠️ số lẻ KHÔNG bị làm tròn lên — nói quá mức giảm là một khẳng định sai', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '$60', priceSale: '$9.50' }).main, 'Save $50.5')
})

test('bỏ số 0 thừa cho gọn', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '$100.00', priceSale: '$50.00' }).main, 'Save $50')
})

test('không bật "theo số tiền" thì vẫn là phần trăm', () => {
  const badge = dealDiscountBadge({ discount: 25, priceOrig: '€199,99', priceSale: '€149,99' })
  assert.equal(badge.main, '25%')
  assert.equal(badge.sub, 'OFF')
})

test('⚠️ giá đọc không ra -> rơi về phần trăm, không in "Save NaN"', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: 'Liên hệ', priceSale: '€149,99' }).main, '25%')
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '€199,99' }).main, '25%')
})

test('giá sale không rẻ hơn giá gốc -> không bịa ra khoản tiết kiệm', () => {
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '€149,99', priceSale: '€199,99' }).main, '25%')
  assert.equal(dealDiscountBadge({ ...base, priceOrig: '€199,99', priceSale: '€199,99' }).main, '25%')
})
