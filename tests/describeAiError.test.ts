/**
 * Dịch lỗi API sang câu người vận hành đọc được.
 *
 * ⚠️ Phép kiểm quan trọng nhất KHÔNG phải "câu chữ đẹp", mà là **phân biệt đúng
 * loại lỗi TỰ HẾT với loại phải đi trả tiền**. Nói "hết tiền" khi thật ra chỉ là
 * quá tải thì người vận hành đi nạp tiền một cách vô ích; nói "thử lại sau" khi
 * ví đã cạn thì họ ngồi bấm lại mãi mà không bao giờ chạy.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeAiError } from '../src/lib/ai/describeAiError'

test('hết tiền: nói rõ nạp ở đâu, và tách khỏi gói Claude Code', () => {
  // Nguyên văn lỗi gặp thật trên /admin/video ngày 23/08/2026.
  const that = new Error('400 {"type":"error","error":{"type":"invalid_request_error",'
    + '"message":"Your credit balance is too low to access the Anthropic API. '
    + 'Please go to Plans & Billing to upgrade or purchase credits."}}')
  const ra = describeAiError(that)
  assert.match(ra, /hết tiền/)
  assert.match(ra, /console\.anthropic\.com/)
  assert.match(ra, /Plans & Billing/)
  // ⚠️ Phải nói rõ đây KHÔNG phải gói Claude Code — hai ví khác nhau, và nhầm
  // chỗ này là đi nâng cấp nhầm thứ.
  assert.match(ra, /Claude Code/)
  // Không còn khối JSON thô trên màn hình.
  assert.ok(!ra.includes('{'), ra)
})

test('quá tải và chặn tốc độ: nói THỬ LẠI, tuyệt đối không nhắc tới tiền', () => {
  for (const e of [
    Object.assign(new Error('rate_limit_error'), { status: 429 }),
    Object.assign(new Error('overloaded_error'), { status: 529 }),
    new Error('Overloaded'),
    Object.assign(new Error('Internal server error'), { status: 500 }),
  ]) {
    const ra = describeAiError(e)
    assert.match(ra, /thử lại/i, ra)
    assert.ok(!/tiền|nạp|Billing/.test(ra), `không được nhắc tiền: ${ra}`)
  }
})

test('khoá sai hoặc thiếu: chỉ đúng chỗ đi kiểm', () => {
  const thieu = describeAiError(new Error('Could not resolve authentication method. Expected x-api-key'))
  assert.match(thieu, /ANTHROPIC_API_KEY/)
  assert.match(thieu, /cron-check/)

  const sai = describeAiError(Object.assign(new Error('authentication_error'), { status: 401 }))
  assert.match(sai, /thu hồi|từ chối/)
  // Khoá bị từ chối thì đi kiểm biến môi trường là vô ích — biến CÓ, chỉ là sai.
  assert.ok(!/cron-check/.test(sai), sai)
})

test('giữ nguyên hai trường hợp cũ mà các trang đang dựa vào', () => {
  assert.match(describeAiError(new Error('Overloaded')), /quá tải/)
  assert.match(
    describeAiError(new Error('Failed to parse structured output after retries')),
    /chưa đúng định dạng/,
  )
})

test('lỗi lạ thì TRẢ NGUYÊN VĂN, không nuốt', () => {
  // ⚠️ Một câu chung chung kiểu "Có lỗi xảy ra" còn tệ hơn khối JSON thô: ít
  // nhất khối JSON còn tra cứu được.
  assert.match(describeAiError(new Error('ENOSPC: no space left on device')), /ENOSPC/)
})

test('nhận mọi hình dạng lỗi mà không tự ném', () => {
  for (const e of [null, undefined, '', 'chuỗi trần', 42, {}, { status: 429 }, new Error(''), [1, 2]]) {
    assert.doesNotThrow(() => describeAiError(e), String(e))
    assert.equal(typeof describeAiError(e), 'string')
  }
})

test('cắt ngắn lỗi dài để không phá vỡ khung giao diện', () => {
  assert.ok(describeAiError(new Error('x'.repeat(5000))).length <= 300)
})

test('không nhầm lỗi hết giờ thành lỗi hết tiền', () => {
  const ra = describeAiError(new Error('ETIMEDOUT'))
  assert.match(ra, /thử lại/i)
  assert.ok(!/Billing/.test(ra), ra)
})
