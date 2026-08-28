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
import {
  breakEven, dailyPlan, estimateAvgOrderValue, estimateDungDuocLamUSD,
} from '@/lib/adPlanner'

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
  const r = estimateAvgOrderValue(['$10', '$20', '$30'])!
  assert.equal(r.avg, 20)
  assert.equal(r.count, 3)
  assert.equal(r.symbol, '$')
})

test('⚠️ trung bình trên 1 mẫu vẫn trả về, nhưng count phải lộ ra để giao diện cảnh báo', () => {
  const r = estimateAvgOrderValue(['$99'])!
  assert.equal(r.avg, 99)
  assert.equal(r.count, 1)
})

test('bỏ giá đọc không được, không để null kéo trung bình xuống', () => {
  const r = estimateAvgOrderValue(['$100', null, '$200', undefined])!
  assert.equal(r.avg, 150)
  assert.equal(r.count, 2)
})

test('không có giá nào -> null', () => {
  assert.equal(estimateAvgOrderValue([]), null)
  assert.equal(estimateAvgOrderValue([null, null]), null)
  // Chuỗi không có chữ số nào, và giá 0 — cả hai đều không phải giá trị đơn.
  assert.equal(estimateAvgOrderValue(['$0', 'Free', 'N/A', '']), null)
})

test('giá không kèm ký hiệu được coi là USD — mặc định của priceSymbol', () => {
  // Dữ liệu cũ có deal lưu giá trần không ký hiệu. Coi là USD là mặc định đã
  // ghi trong `priceSymbol()`; ghi lại ở đây để nếu ai đổi mặc định thì test đỏ,
  // vì đổi nó sẽ âm thầm làm mọi ước lượng cũ ngừng dùng được cho breakEven.
  const r = estimateAvgOrderValue(['1200', '800'])!
  assert.equal(r.symbol, '$')
  assert.equal(r.avg, 1000)
  assert.equal(estimateDungDuocLamUSD(r), true)
})

// ── Lỗi tiền tệ đã sống 18 ngày (10/08 → 28/08) ───────────────────
test('🚨 KHÔNG trộn hai tiền tệ vào một phép trung bình', () => {
  // Đây chính là lỗi đã xảy ra: giá rupee và giá đô cộng chung, chia đều, rồi
  // kết quả được `breakEven()` hiểu là USD.
  const r = estimateAvgOrderValue(['₹999', '₹4999', '₹1299', '$50'])!
  assert.equal(r.symbol, '₹')     // nhóm đông nhất thắng
  assert.equal(r.count, 3)        // chỉ 3 giá rupee được tính
  assert.equal(r.skipped, 1)      // $50 bị bỏ ra, và phải NÓI RA là đã bỏ
  assert.ok(Math.abs(r.avg - (999 + 4999 + 1299) / 3) < 1e-9)
})

test('🚨 ước lượng KHÔNG phải USD thì không được dùng cho breakEven', () => {
  const rupee = estimateAvgOrderValue(['₹999', '₹1499'])
  assert.equal(estimateDungDuocLamUSD(rupee), false)

  const dola = estimateAvgOrderValue(['$500', '$540'])
  assert.equal(estimateDungDuocLamUSD(dola), true)

  // Cả euro cũng bị chặn: €/$ lệch 5–20%, chưa đủ để coi là một.
  assert.equal(estimateDungDuocLamUSD(estimateAvgOrderValue(['€199,99'])), false)
  assert.equal(estimateDungDuocLamUSD(null), false)
})

test('🚨 ca thật của WoWGadgets99 — con số từng đẻ ra kết luận ngược', () => {
  // Giá thật đo 28/08 trên wowgadgets99.com. Bản cũ nhận number[] nên mất ký
  // hiệu ₹, ra ~1257 và `breakEven()` đọc thành $1257 -> "cần 0,4% khách mua,
  // có cửa". Sự thật ₹1257 ≈ $15 -> cần ~33% -> không thể.
  const est = estimateAvgOrderValue(['₹999', '₹649', '₹1299', '₹799', '₹599'])!
  assert.equal(est.symbol, '₹')
  assert.equal(estimateDungDuocLamUSD(est), false, 'ước lượng rupee KHÔNG được coi là USD')

  // Và để thấy rõ hậu quả nếu vẫn nhét vào: cùng con số, hai kết luận trái ngược.
  const neuDocNhamLaUSD = breakEven({ commissionRate: 10, avgOrderValue: est.avg, cpc: 0.5 })!
  const quyDoiDung = breakEven({ commissionRate: 10, avgOrderValue: est.avg / 83, cpc: 0.5 })!
  assert.equal(neuDocNhamLaUSD.verdict, 'good')      // ← kết luận SAI đã sống 18 ngày
  assert.equal(quyDoiDung.verdict, 'hopeless')       // ← sự thật
})

test('giá châu Âu dùng dấu phẩy thập phân vẫn đọc đúng', () => {
  // €199,99 phải là 199.99 chứ không phải 19999 — luật ở priceAmount.ts.
  const r = estimateAvgOrderValue(['€199,99', '€99,99'])!
  assert.ok(Math.abs(r.avg - 149.99) < 1e-9, `ra ${r.avg}`)
  assert.equal(r.symbol, '€')
})
