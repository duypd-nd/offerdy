/**
 * Đọc số ra khỏi chuỗi giá.
 *
 * Cả đặt cược: **cùng một con số đó được in lên thẻ deal, lên ảnh Open Graph và vào
 * caption mạng xã hội**. Sai ở đây không dừng ở ô admin — nó thành một lời hứa giảm
 * giá sai gấp trăm lần trước mặt người mua.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePriceAmount, priceSymbol, formatAmount } from '@/lib/priceAmount'

test('⚠️ dấu phẩy thập phân kiểu châu Âu — chính ca đã đẻ ra "Save €5000"', () => {
  assert.equal(parsePriceAmount('€199,99'), 199.99)
  assert.equal(parsePriceAmount('€149,99'), 149.99)
  // 199,99 − 149,99 = 50, không phải 5000.
  assert.equal(parsePriceAmount('€199,99')! - parsePriceAmount('€149,99')!, 50)
})

test('dấu phẩy ngăn nghìn kiểu Mỹ', () => {
  assert.equal(parsePriceAmount('$1,299.99'), 1299.99)
  assert.equal(parsePriceAmount('$1,299'), 1299)
})

test('⚠️ dấu chấm ngăn nghìn — VND và IDR luôn viết kiểu này', () => {
  // Dự án có deal thật bán bằng IDR: Rp4.961.899.
  assert.equal(parsePriceAmount('Rp4.961.899'), 4961899)
  assert.equal(parsePriceAmount('₫250.000'), 250000)
  assert.equal(parsePriceAmount('₫250.000')! - parsePriceAmount('₫200.000')!, 50000)
})

test('cả hai dấu cùng có -> dấu ĐỨNG SAU là dấu thập phân', () => {
  assert.equal(parsePriceAmount('€1.299,99'), 1299.99)
  assert.equal(parsePriceAmount('$1,299.99'), 1299.99)
})

test('không có dấu nào', () => {
  assert.equal(parsePriceAmount('$60'), 60)
  assert.equal(parsePriceAmount('60'), 60)
})

test('⚠️ ba chữ số sau dấu -> đọc là NGĂN NGHÌN, không phải thập phân', () => {
  // Chỗ nhập nhằng thật duy nhất. Đọc ngược lại thì mọi giá VND/IDR sai gấp nghìn lần,
  // còn "$1.500" hiểu là một đô rưỡi là một mức giá không ai đăng.
  assert.equal(parsePriceAmount('$1.500'), 1500)
  assert.equal(parsePriceAmount('$1,500'), 1500)
  // Một hai chữ số thì luôn là thập phân.
  assert.equal(parsePriceAmount('$50.5'), 50.5)
  assert.equal(parsePriceAmount('$50,5'), 50.5)
})

test('⚠️ đọc không ra thì trả null, KHÔNG trả 0', () => {
  // Một số 0 lặng lẽ sẽ thành "Save €200" thay vì không hiện gì.
  assert.equal(parsePriceAmount('Liên hệ'), null)
  assert.equal(parsePriceAmount(''), null)
  assert.equal(parsePriceAmount(undefined), null)
})

test('giữ đúng ký hiệu tiền tệ của chính chuỗi giá', () => {
  assert.equal(priceSymbol('€199,99'), '€')
  assert.equal(priceSymbol('₫250.000'), '₫')
  assert.equal(priceSymbol('Rp4.961.899'), 'Rp')
  assert.equal(priceSymbol('CA$49.99'), 'CA$')
  // Không có ký hiệu thì mới dùng mặc định.
  assert.equal(priceSymbol('199.99'), '$')
})

test('⚠️ số hiển thị: bỏ số 0 thừa, nhưng KHÔNG làm tròn lên', () => {
  assert.equal(formatAmount(50), '50')
  assert.equal(formatAmount(50.0), '50')
  // Bản cũ Math.round biến 50.5 thành "51" — nói quá mức giảm trên trang công khai.
  assert.equal(formatAmount(50.5), '50.5')
  assert.equal(formatAmount(12.34), '12.34')
  assert.equal(formatAmount(50000), '50000')
})
