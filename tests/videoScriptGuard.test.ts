/**
 * Hàng rào chạy TRÊN đầu ra của AI cho kịch bản video.
 *
 * ⚠️ Đây là lỗi cứng, cố ý. Một câu bịa số đi ra video thì không gỡ lại được —
 * video đã đăng lên TikTok rồi. Thà dừng và bắt bấm lại một lần.
 *
 * Dự án đã có luật "không bịa nội dung marketing" và đã có `priceAmount.ts` vì
 * từng hiện "Save €5000" cho một sản phẩm €199,99. Phép kiểm dưới đây bảo vệ
 * đúng chỗ đó, ở nơi hậu quả nặng nhất.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kiemTraKichBan, type Beat, type VideoScriptInput } from '../src/lib/ai/generateVideoScript'

const SU_THAT = [
  'Product name: CozyRoo 6-in-1 Hipseat Carrier',
  'Current price: $49.95',
  'Original price: $89.95',
  'Discount: 44% off',
  'The store has coupon code OFFERDY (store-wide, may exclude sale items)',
  '9 product photos available',
]

const nen = (extra: Partial<VideoScriptInput> = {}): VideoScriptInput => ({
  ten: 'CozyRoo 6-in-1 Hipseat Carrier',
  shop: 'BloomingBabies',
  moTa: 'Padded hip seat carrier with six positions.',
  giayMucTieu: 26,
  suThatDaKiemChung: SU_THAT,
  ...extra,
})

const nhip = (o: Partial<Beat> = {}): Beat => ({
  type: 'benefit',
  voiceText: 'The padded hip seat shifts weight onto your hips.',
  overlayText: 'PADDED HIP SEAT',
  ...o,
})

// ── Bịa số ────────────────────────────────────────────────────────

test('CHẶN: số không nằm trong sự thật đã kiểm chứng', () => {
  assert.throws(
    () => kiemTraKichBan([nhip({ voiceText: 'Over 10000 parents already switched to it.' })], nen()),
    /khong nam trong su that/i,
  )
})

test('CHẶN: phần trăm bịa dù sản phẩm CÓ % giảm giá thật', () => {
  // 44% là thật, 60% thì không — hàng rào phải soi từng con số, không chỉ hỏi
  // "sản phẩm này có giảm giá không".
  assert.throws(
    () => kiemTraKichBan([nhip({ voiceText: 'Right now you save 60 percent on it.' })], nen()),
    /khong nam trong su that/i,
  )
})

test('CHẶN: nói về phần trăm khi KHÔNG có số giảm giá nào', () => {
  assert.throws(
    () => kiemTraKichBan(
      [nhip({ voiceText: 'It is 30% off today only.' })],
      nen({ suThatDaKiemChung: ['Product name: A bag', 'No discount percentage available'] }),
    ),
    /phan tram|khong nam trong/i,
  )
})

test('CHO QUA: số lấy đúng từ sự thật', () => {
  kiemTraKichBan([nhip({ voiceText: 'It adjusts into 6 positions as your baby grows.' })], nen({
    suThatDaKiemChung: [...SU_THAT, 'Description mentions 6 carrying positions'],
  }))
})

test('CHO QUA: câu không có số nào', () => {
  kiemTraKichBan([nhip(), nhip({ type: 'hook', voiceText: 'Tired of aching arms?', overlayText: 'ACHING ARMS?' })], nen())
})

// ── Social proof ──────────────────────────────────────────────────

test('CHẶN: nhịp social proof khi sản phẩm KHÔNG có đánh giá thật', () => {
  assert.throws(
    () => kiemTraKichBan(
      [nhip({ type: 'socialProof', voiceText: 'Parents everywhere rate it highly.', overlayText: 'LOVED BY PARENTS' })],
      nen(),
    ),
    /social proof/i,
  )
})

test('CHO QUA: social proof với điểm đánh giá THẬT từ JSON-LD', () => {
  kiemTraKichBan(
    [nhip({ type: 'socialProof', voiceText: "It's rated 4.7 out of 5 from 49 reviews.", overlayText: '4.7 STARS' })],
    nen({ rating: 4.7, reviewCount: 49, suThatDaKiemChung: [...SU_THAT, 'Real rating: 4.7 out of 5 from 49 reviews'] }),
  )
})

// ── Hình dạng ─────────────────────────────────────────────────────

test('CHẶN: kịch bản rỗng', () => {
  assert.throws(() => kiemTraKichBan([], nen()), /nhip nao/i)
})

test('CHẶN: nhịp thiếu lời đọc hoặc thiếu chữ trên màn', () => {
  assert.throws(() => kiemTraKichBan([nhip({ voiceText: '   ' })], nen()), /khong co loi doc/i)
  assert.throws(() => kiemTraKichBan([nhip({ overlayText: '' })], nen()), /chu tren man/i)
})

test('CHẶN: câu dài quá đọc không kịp trong một cảnh', () => {
  assert.throws(() => kiemTraKichBan([nhip({ voiceText: 'a word '.repeat(40) })], nen()), /dai qua/i)
})

test('gom MỌI lỗi vào một thông báo, không dừng ở lỗi đầu tiên', () => {
  try {
    kiemTraKichBan([nhip({ voiceText: 'Over 9000 sold.' }), nhip({ overlayText: '' })], nen())
    assert.fail('phải ném lỗi')
  } catch (e) {
    const s = String(e)
    assert.ok(/9000/.test(s), s)
    assert.ok(/chu tren man/.test(s), s)
  }
})
