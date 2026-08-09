/**
 * Điểm hoà vốn cho quảng cáo trả tiền.
 *
 * Cả điểm của bộ số này: trả lời "để có lãi thì điều gì phải đúng" **trước khi**
 * tiêu tiền. Doanh thu affiliate thật nằm bên GoAffPro và site không nhìn thấy,
 * nên lợi nhuận thực tế không tính được — nhưng điều kiện cần thì tính được, và
 * nó đủ để loại bớt shop mà không tốn đồng nào.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breakEven, dailyPlan, estimateAvgOrderValue } from '@/lib/adPlanner'

// ── Bốn ca dưới dùng giá trị đơn TB đo được trên production 2026-08-10 ──
test('⚠️ cùng CPC, cùng % hoa hồng — bốn shop thật ra bốn kết luận khác hẳn', () => {
  const cpc = 0.5, commissionRate = 10

  const wow = breakEven({ commissionRate, avgOrderValue: 1256.95, cpc })!
  assert.equal(wow.verdict, 'good')
  assert.ok(wow.breakEvenConversion < 0.005, `WoWGadgets99 cần ${wow.breakEvenConversion}`)

  const dowinx = breakEven({ commissionRate, avgOrderValue: 149.54, cpc })!
  assert.equal(dowinx.verdict, 'tight')

  const cloud = breakEven({ commissionRate, avgOrderValue: 47.8, cpc })!
  assert.equal(cloud.verdict, 'hopeless')
  assert.ok(cloud.breakEvenConversion > 0.1, 'Cloud Cushion cần hơn 10% khách mua')

  const hunny = breakEven({ commissionRate, avgOrderValue: 39.82, cpc })!
  assert.equal(hunny.verdict, 'hopeless')
})

test('tiền mỗi đơn = giá trị đơn × % hoa hồng', () => {
  const r = breakEven({ commissionRate: 10, avgOrderValue: 200, cpc: 1 })!
  assert.equal(r.earningsPerOrder, 20)
  assert.equal(r.breakEvenConversion, 0.05) // $1 ÷ $20
})

test('⚠️ thiếu dữ liệu -> null, TUYỆT ĐỐI không phải 0', () => {
  // Một bảng hiện "0%" cho shop chưa khai hoa hồng sẽ bị đọc thành "shop này hoà
  // vốn dễ nhất" — đúng ngược hẳn sự thật.
  assert.equal(breakEven({ commissionRate: null, avgOrderValue: 100, cpc: 0.5 }), null)
  assert.equal(breakEven({ avgOrderValue: 100, cpc: 0.5 }), null)
  assert.equal(breakEven({ commissionRate: 10, avgOrderValue: undefined, cpc: 0.5 }), null)
  assert.equal(breakEven({ commissionRate: 0, avgOrderValue: 100, cpc: 0.5 }), null)
  assert.equal(breakEven({ commissionRate: 10, avgOrderValue: 0, cpc: 0.5 }), null)
})

test('CPC vô nghĩa -> null, không chia cho 0', () => {
  assert.equal(breakEven({ commissionRate: 10, avgOrderValue: 100, cpc: 0 }), null)
  assert.equal(breakEven({ commissionRate: 10, avgOrderValue: 100, cpc: -1 }), null)
  assert.equal(breakEven({ commissionRate: 10, avgOrderValue: 100, cpc: NaN }), null)
})

test('tỉ lệ cần vượt 100% vẫn phải trả về số thật, không bị kẹp', () => {
  // CPC $5 mà mỗi đơn chỉ được $2 → cần 250% khách mua, tức bất khả thi.
  // Kẹp về 100% sẽ giấu mất mức độ vô vọng.
  const r = breakEven({ commissionRate: 10, avgOrderValue: 20, cpc: 5 })!
  assert.equal(r.breakEvenConversion, 2.5)
  assert.equal(r.verdict, 'hopeless')
})

// ── Ngân sách ngày ────────────────────────────────────────────────
test('ngân sách -> số lượt bấm mua được và số đơn cần có', () => {
  const p = dailyPlan(50, 0.5, 20)!
  assert.equal(p.clicks, 100)
  assert.equal(p.ordersNeeded, 3) // 50 ÷ 20 = 2,5 → làm tròn LÊN
})

test('số đơn cần luôn làm tròn LÊN — nửa đơn không tồn tại', () => {
  assert.equal(dailyPlan(10, 1, 3)!.ordersNeeded, 4) // 3,33 → 4
  assert.equal(dailyPlan(20, 1, 20)!.ordersNeeded, 1)
})

test('tham số vô nghĩa -> null', () => {
  assert.equal(dailyPlan(0, 0.5, 20), null)
  assert.equal(dailyPlan(50, 0, 20), null)
  assert.equal(dailyPlan(50, 0.5, 0), null)
})

// ── Ước lượng giá trị đơn từ giá deal ─────────────────────────────
test('ước lượng giá trị đơn, và trả về CẢ số mẫu', () => {
  const r = estimateAvgOrderValue([10, 20, 30])!
  assert.equal(r.avg, 20)
  assert.equal(r.count, 3)
})

test('⚠️ trung bình trên 1 mẫu vẫn trả về, nhưng count phải lộ ra để giao diện cảnh báo', () => {
  const r = estimateAvgOrderValue([99])!
  assert.equal(r.avg, 99)
  assert.equal(r.count, 1)
})

test('bỏ giá đọc không được, không để null kéo trung bình xuống', () => {
  const r = estimateAvgOrderValue([100, null, 200, null])!
  assert.equal(r.avg, 150)
  assert.equal(r.count, 2)
})

test('không có giá nào -> null', () => {
  assert.equal(estimateAvgOrderValue([]), null)
  assert.equal(estimateAvgOrderValue([null, null]), null)
  assert.equal(estimateAvgOrderValue([0, -5]), null)
})
