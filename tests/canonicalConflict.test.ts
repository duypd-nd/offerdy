/**
 * Google có đang chọn canonical khác thứ mình khai không.
 *
 * Cả bài học nằm ở ca đầu tiên: so sánh chuỗi thô làm **trang chủ** — trang khoẻ
 * nhất site, `verdict: PASS` — hiện một cảnh báo đỏ mãi mãi, chỉ vì lệch một dấu
 * `/`. Báo động giả trên trang không hỏng còn tệ hơn im lặng: nó gửi người vận
 * hành đi sửa thứ không cần sửa, và dạy họ bỏ qua cảnh báo thật lần sau.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalConflict } from '@/lib/urlInspection'

test('⚠️ chính ca đã đẻ ra báo động giả ở trang chủ — lệch đúng một dấu /', () => {
  assert.equal(
    canonicalConflict('https://www.offerdy.com', 'https://www.offerdy.com/'),
    false
  )
  assert.equal(
    canonicalConflict('https://www.offerdy.com/', 'https://www.offerdy.com'),
    false
  )
})

test('nhiều dấu / cuối cũng là cùng một trang', () => {
  assert.equal(canonicalConflict('https://a.com/x', 'https://a.com/x///'), false)
})

test('xung đột THẬT vẫn phải báo — đây mới là lý do hàm này tồn tại', () => {
  assert.equal(
    canonicalConflict('https://www.offerdy.com/stores/abc', 'https://www.offerdy.com/stores/xyz'),
    true
  )
  // Google gộp trang này vào một trang khác — mất hẳn khả năng tự xếp hạng.
  assert.equal(
    canonicalConflict('https://www.offerdy.com/', 'https://www.offerdy.com/blog/bai-viet'),
    true
  )
})

test('thiếu một trong hai vế thì KHÔNG kết luận', () => {
  // Google chưa bò tới thì không có `googleCanonical`. Im lặng, đừng đoán.
  assert.equal(canonicalConflict(null, 'https://www.offerdy.com/'), false)
  assert.equal(canonicalConflict('https://www.offerdy.com/', null), false)
  assert.equal(canonicalConflict(null, null), false)
})

test('khác giao thức hoặc khác host là xung đột thật, không được chuẩn hoá đi', () => {
  assert.equal(canonicalConflict('http://www.offerdy.com/x', 'https://www.offerdy.com/x'), true)
  assert.equal(canonicalConflict('https://offerdy.com/x', 'https://www.offerdy.com/x'), true)
})
