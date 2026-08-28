/**
 * Bộ đề xuất tăng/giữ/dừng cho chiến dịch quảng cáo.
 *
 * Điểm quan trọng nhất của bộ số này KHÔNG phải là nó biết khi nào nên tăng —
 * mà là nó biết khi nào **chưa nói được gì**. Nền đếm của site rất thưa (56 lượt
 * bấm sang merchant cả đời, 21 trong 30 ngày, đo 28/08/2026), nên một chiến dịch
 * ra 3 lượt bấm không phân biệt được tốt với xấu. Luật 8c đặt thẳng vào code.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_MERCHANT_CLICKS, assessCampaign, coDuocChayQuangCaoStore, valuePerMerchantClick,
} from '@/lib/adPerformance'
import { earningsPerOrder } from '@/lib/adPlanner'

// ── Quy đổi một lượt bấm ra tiền ───────────────────────────────────────────
test('giá trị mỗi lượt bấm = hoa hồng mỗi đơn × tỉ lệ đơn ước tính', () => {
  // Dowinx: đơn TB $149,54 × 10% hoa hồng = $14,954 mỗi đơn.
  assert.equal(earningsPerOrder(10, 149.54), 14.954)
  // Giả định 2% khách bấm sang sẽ mua -> $0,299 mỗi lượt bấm.
  const v = valuePerMerchantClick(10, 149.54, 0.02)!
  assert.ok(Math.abs(v - 0.29908) < 1e-9, `ra ${v}`)
})

test('⚠️ thiếu dữ liệu trả null, KHÔNG trả 0', () => {
  // Một bảng hiện "$0" cho shop chưa khai sẽ bị đọc thành "shop này rẻ nhất" —
  // tức đúng ngược hẳn sự thật. Đây là tiền lệ đã ghi trong adPlanner.ts.
  assert.equal(valuePerMerchantClick(null, 149.54, 0.02), null)
  assert.equal(valuePerMerchantClick(10, null, 0.02), null)
  assert.equal(valuePerMerchantClick(10, 149.54, null), null)
  assert.equal(valuePerMerchantClick(0, 149.54, 0.02), null)
  // Tỉ lệ đơn phải là 0..1, không phải phần trăm — 20 là lỗi nhập, không phải 2000%.
  assert.equal(valuePerMerchantClick(10, 149.54, 20), null)
})

// ── Cốt lõi: biết khi nào chưa nói được gì ─────────────────────────────────
test('⚠️ mẫu mỏng mà đang có lãi thì VẪN không được khuyên tăng', () => {
  // $0,10/lượt so với ngưỡng $0,50 — nhìn thì rất tốt. Nhưng 3 lượt bấm không
  // phân biệt được may mắn với thật. Đây là ca dễ sai nhất của cả bộ.
  const r = assessCampaign({ cost: 0.3, merchantClicks: 3, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'chua-du-so-lieu')
  assert.match(r.reason, /Chưa đủ để tin/)
})

test('đủ mẫu + rẻ hơn nửa ngưỡng -> mới được khuyên tăng', () => {
  const r = assessCampaign({ cost: 5, merchantClicks: MIN_MERCHANT_CLICKS, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'tang') // $0,20/lượt < $0,25
})

test('đủ mẫu nhưng biên mỏng -> giữ, không tăng', () => {
  const r = assessCampaign({ cost: 10, merchantClicks: MIN_MERCHANT_CLICKS, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'giu') // $0,40/lượt: dưới $0,50 nhưng trên $0,25
})

test('lỗ rõ ràng -> dừng NGAY, không chờ đủ mẫu', () => {
  // Bất đối xứng có chủ đích: chờ thêm ở đây chỉ để mất thêm tiền.
  const r = assessCampaign({ cost: 4, merchantClicks: 2, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'dung') // $2,00/lượt so với ngưỡng $0,50
  assert.match(r.reason, /Đang lỗ/)
})

// ── Ngoại lệ Poisson: không có click nào VẪN là thông tin ──────────────────
test('⚠️ tiêu gấp 3 ngưỡng mà 0 lượt bấm -> dừng, dù chưa đủ mẫu', () => {
  // λ=3 thì P(thấy 0 lượt) ≈ 5%. Gần như chắc chắn dưới điểm hoà vốn.
  const r = assessCampaign({ cost: 1.5, merchantClicks: 0, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'dung')
  assert.equal(r.costPerMerchantClick, null) // chia cho 0 không được ra Infinity
})

test('0 lượt bấm nhưng tiêu chưa đủ -> chưa kết luận', () => {
  const r = assessCampaign({ cost: 0.4, merchantClicks: 0, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'chua-du-so-lieu')
  assert.match(r.reason, /chưa đủ để kết luận/)
})

test('chưa tiêu đồng nào -> chưa kết luận, kể cả khi đã có click', () => {
  const r = assessCampaign({ cost: 0, merchantClicks: 40, valuePerMerchantClick: 0.5 })!
  assert.equal(r.verdict, 'chua-du-so-lieu')
})

test('đầu vào vô lý trả null chứ không đoán', () => {
  assert.equal(assessCampaign({ cost: -1, merchantClicks: 5, valuePerMerchantClick: 0.5 }), null)
  assert.equal(assessCampaign({ cost: 5, merchantClicks: -1, valuePerMerchantClick: 0.5 }), null)
  assert.equal(assessCampaign({ cost: 5, merchantClicks: 1.5, valuePerMerchantClick: 0.5 }), null)
  // Không có ngưỡng hoà vốn thì không có gì để so — đây là ca 107/107 store hiện nay.
  assert.equal(assessCampaign({ cost: 5, merchantClicks: 5, valuePerMerchantClick: 0 }), null)
})

// ── Hàng rào điều khoản PPC ────────────────────────────────────────────────
test('⚠️ "chưa xác minh" bị CHẶN, không được coi là "chắc là được"', () => {
  // Vi phạm điều khoản PPC thường dẫn tới chấm dứt chương trình VÀ mất phần hoa
  // hồng đã tích — mặc định phải là từ chối. Chính schema store.ts ghi lý do đó.
  assert.equal(coDuocChayQuangCaoStore('unknown').duoc, false)
  assert.equal(coDuocChayQuangCaoStore(undefined).duoc, false)
  assert.equal(coDuocChayQuangCaoStore(null).duoc, false)
  assert.equal(coDuocChayQuangCaoStore('no').duoc, false)
})

test('bốn giá trị thật của allowsPaidTraffic — chép từ schema, không gõ lại', () => {
  assert.equal(coDuocChayQuangCaoStore('yes').duoc, true)
  assert.equal(coDuocChayQuangCaoStore('yes').canhBao, undefined)

  // Cho phép chạy NHƯNG phải kèm cảnh báo — bỏ cảnh báo là mất cả chương trình.
  const be = coDuocChayQuangCaoStore('brand_excluded')
  assert.equal(be.duoc, true)
  assert.match(be.canhBao ?? '', /thương hiệu/)
})
