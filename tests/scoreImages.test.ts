/**
 * Chọn và xếp ảnh trước khi đưa vào video.
 *
 * ⚠️ Phép kiểm quan trọng nhất ở đây KHÔNG phải "có bỏ đúng ảnh xấu không" —
 * đó là việc của model. Nó là **các hàng rào quanh model**: không bao giờ bỏ
 * quá tay đến mức video còn 1 ảnh, không bao giờ bỏ tấm ảnh trong kho mà người
 * vận hành đã tự chọn, và khi không chấm được thì trả lại nguyên thứ tự cũ chứ
 * không âm thầm xáo trộn.
 *
 * Đo thật 38 ảnh của 5 deal (2026-08-22) cho thấy không tín hiệu nào ngoài
 * chính điểm ảnh phân biệt được ảnh tốt với ảnh cận cảnh chi tiết — nên bộ lọc
 * theo URL đã bị bỏ, và code chỉ còn giữ phần chính sách. Chi tiết ở đầu
 * `src/lib/video/scoreImages.ts`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreImages, type DanhGiaAnh } from '../src/lib/video/scoreImages'

const ANH = ['kho.jpg', 'a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']

const cham = (index: number, diem: number, extra: Partial<DanhGiaAnh> = {}): DanhGiaAnh => ({
  index, diem, nhieuChu: false, toanCanh: true, lyDo: '', ...extra,
})

// ── Đường lùi an toàn ──────────────────────────────────────────────

test('THẬT: không chấm được thì giữ nguyên thứ tự, không bỏ ảnh nào', () => {
  // ⚠️ Một lỗi mạng không được phép làm hỏng video, cũng không được phép âm
  // thầm đổi thứ tự ảnh. `judgeImages()` cố ý nuốt lỗi và trả về null.
  for (const rong of [null, undefined, []]) {
    const r = scoreImages(ANH, rong)
    assert.deepEqual(r.anh, ANH)
    assert.equal(r.bo.length, 0)
    assert.equal(r.daCham, false)
  }
})

test('nhận xét toàn chỉ số rác thì cũng lùi về thứ tự cũ', () => {
  const r = scoreImages(ANH, [cham(99, 0), cham(-1, 0)])
  assert.deepEqual(r.anh, ANH)
  assert.equal(r.daCham, false)
})

test('không có ảnh nào thì không nổ', () => {
  const r = scoreImages([], [cham(0, 9)])
  assert.deepEqual(r.anh, [])
  assert.equal(r.daCham, false)
})

// ── Hàng rào: bỏ quá tay ───────────────────────────────────────────

test('THẬT: model chê hết thì vẫn phải giữ đủ ba ảnh', () => {
  // ⚠️ `buildSpec` quay vòng ảnh, nên ít ảnh không làm video ngắn đi — nó làm
  // một tấm ảnh xuất hiện bốn lần. Thà giữ một ảnh tầm thường.
  const r = scoreImages(ANH, ANH.map((_, i) => cham(i, 0, { nhieuChu: true })))
  assert.equal(r.anh.length, 3)
  assert.equal(r.anh[0], 'kho.jpg', 'ảnh trong kho phải luôn còn')
  assert.equal(r.bo.length, 3)
})

test('kho ảnh nhỏ hơn mức tối thiểu thì giữ hết, không bù ra ảnh không có', () => {
  const hai = ['kho.jpg', 'a.jpg']
  const r = scoreImages(hai, hai.map((_, i) => cham(i, 0, { nhieuChu: true })))
  assert.equal(r.anh.length, 2)
  assert.equal(r.bo.length, 0)
})

test('bù lại thì lấy ảnh điểm cao nhất trong đám bị bỏ', () => {
  const r = scoreImages(ANH, [
    cham(0, 9), cham(1, 1), cham(2, 3), cham(3, 0), cham(4, 1), cham(5, 2),
  ])
  // 0 giữ (ghim), còn lại dưới ngưỡng 4 hết -> bù hai cái điểm cao nhất: 2 rồi 5
  assert.deepEqual(r.anh, ['kho.jpg', 'b.jpg', 'e.jpg'])
})

// ── Hàng rào: ảnh trong kho ────────────────────────────────────────

test('THẬT: ảnh trong kho không bao giờ bị bỏ và luôn đứng đầu', () => {
  // Người vận hành đã tự chọn tấm này khi tạo deal, và khách đã thấy nó trên
  // trang web. Cảnh mở đầu phải là tấm đó.
  const r = scoreImages(ANH, [
    cham(0, 0, { nhieuChu: true, lyDo: 'model chê' }),
    cham(1, 10), cham(2, 9), cham(3, 8), cham(4, 7), cham(5, 6),
  ])
  assert.equal(r.anh[0], 'kho.jpg')
  assert.ok(!r.bo.some(b => b.url === 'kho.jpg'))
})

// ── Chính sách lọc và xếp ──────────────────────────────────────────

test('bỏ ảnh nhiều chữ và ảnh dưới ngưỡng, giữ phần còn lại', () => {
  const r = scoreImages(ANH, [
    cham(0, 8), cham(1, 9), cham(2, 2, { lyDo: 'cận cảnh vải có vòng phóng to' }),
    cham(3, 7), cham(4, 5, { nhieuChu: true, lyDo: 'bảng số đo' }), cham(5, 6),
  ])
  assert.deepEqual(r.anh, ['kho.jpg', 'a.jpg', 'c.jpg', 'e.jpg'])
  assert.deepEqual(r.bo.map(b => b.url).sort(), ['b.jpg', 'd.jpg'])
})

test('lý do bỏ nói rõ vì sao — người vận hành phải xem lại được', () => {
  const r = scoreImages(ANH, [
    cham(0, 8), cham(1, 8), cham(2, 8), cham(3, 8),
    cham(4, 1, { toanCanh: false, lyDo: 'cận cảnh đường chỉ' }),
    cham(5, 1, { nhieuChu: true, lyDo: 'bảng số đo' }),
  ])
  const ly = Object.fromEntries(r.bo.map(b => [b.url, b.lyDo]))
  assert.match(ly['d.jpg'], /cận cảnh/)
  assert.match(ly['e.jpg'], /nhiều chữ/)
  assert.match(ly['e.jpg'], /bảng số đo/)
})

test('xếp theo điểm giảm dần, hoà điểm thì giữ thứ tự gốc', () => {
  const r = scoreImages(ANH, [
    cham(0, 5), cham(1, 6), cham(2, 9), cham(3, 6), cham(4, 8), cham(5, 7),
  ])
  assert.deepEqual(r.anh, ['kho.jpg', 'b.jpg', 'd.jpg', 'e.jpg', 'a.jpg', 'c.jpg'])
})

test('ảnh model không nói tới thì giữ, xếp giữa bảng', () => {
  // Model bỏ sót một ảnh là chuyện xảy ra. Bỏ sót không được hiểu là "ảnh xấu".
  const r = scoreImages(ANH, [cham(0, 8), cham(1, 9), cham(2, 1)])
  assert.ok(r.anh.includes('c.jpg'))
  assert.ok(r.anh.includes('d.jpg'))
  assert.ok(!r.anh.includes('b.jpg'), 'ảnh bị chấm 1 điểm phải bị bỏ')
})

test('không bao giờ trả về ảnh trùng hoặc ảnh lạ', () => {
  const r = scoreImages(ANH, ANH.map((_, i) => cham(i, i)))
  assert.equal(new Set(r.anh).size, r.anh.length)
  for (const u of r.anh) assert.ok(ANH.includes(u), `${u} không nằm trong danh sách gốc`)
  for (const b of r.bo) assert.ok(ANH.includes(b.url))
  assert.equal(r.anh.length + r.bo.length, ANH.length, 'không được làm mất hay nhân bản ảnh')
})
