/**
 * Ưu đãi cấp shop hay trỏ được sản phẩm.
 *
 * ⚠️ MỌI tiêu đề dưới đây lấy từ dữ liệu THẬT trong Sanity, không tự nghĩ ra.
 * Hàm này quyết định mẫu số của thanh tiến độ ở `/admin/deep-links`, nên sai
 * theo hướng "quá tay" sẽ giấu mất việc thật, còn sai theo hướng "dễ tính" sẽ
 * bắt người vận hành đuổi theo một cái đích không tồn tại.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStoreWideOffer, isLinkableOffer } from '../src/lib/storeWideOffer'

// ── Cấp shop: vận chuyển, năm thứ tiếng ────────────────────────────
test('THẬT: miễn phí vận chuyển — mọi ngôn ngữ gặp trong dữ liệu', () => {
  for (const t of [
    'Free shipping on all US order or order above $100',
    'Free Same Day Shipping on Orders $100+',
    'GRATIS VERZENDING OP ALLE BESTELLINGEN',           // Hà Lan
    'Kostenloser Versand ab 250 €',                     // Đức
    'Versand innerhalb von 24 h',                       // Đức
    "Livraison Offerte dès 60€ d'achat",                // Pháp
    '¡Envío GRATIS a partir de 40€ en Península!',      // Tây Ban Nha
    'Free shipping and tax-free throughout Europe at HWWH',
  ]) assert.equal(isStoreWideOffer(t), true, t)
})

test('THẬT: đổi trả và bảo hành', () => {
  for (const t of [
    '30 DAYS RETURN - Exchange within 30 days with 100% PAYMENT SECURE',
    '30-Day Returns - Easy returns for peace of mind.',
    '30-Day Money-Back Guarantee with Same-Day Shipping in the US',
    'LIFETIME SERVICE WARRANTY on every piece from IBIZ Jewel',
    '100-Day Return Guarantee and 1-Year Warranty on every Motorisely ride',
    '30 DAGEN GELD TERUG GARANTIE',                     // Hà Lan
    'Lebenslange Garantie',                             // Đức
    '100% Satisfait ou Remboursé',                      // Pháp
  ]) assert.equal(isStoreWideOffer(t), true, t)
})

test('THẬT: áp cho cả đơn hàng / cả shop', () => {
  for (const t of [
    '10% Off On Your Order at Lamp Depot with this exclusive offer',
    '15% de réduction On Your Order at Cocon d\'Ange with this exclusive offer',
    '10% De Descuento On Your Order at KUNKAY with this exclusive offer',
    'GEAR UP FOR SUMMER: 15% OFF SITEWIDE at Tolaccea - no code needed',
    '10% Off First Order at Empower Beautiful',
    "Don't miss 30% off your first purchase at Shopmossrose",
    'Extra 5% Off - Automatically Applied at Checkout',
    'Up to 50% off in the ALELLY Sale - discount applies automatically at checkout, no discount code required',
    '69€ Rabatt ab 599€ Einkaufswert',                  // Đức
  ]) assert.equal(isStoreWideOffer(t), true, t)
})

test('THẬT: chương trình, không phải sản phẩm', () => {
  for (const t of [
    'Frizzlife Rewards Program',
    '10% Off First Order with Newsletter Sign-Up',
    'Bulk Discounts on 5+ Units',
    'Monthly Surf Lesson Subscriptions at Fulcrumsurf',
  ]) assert.equal(isStoreWideOffer(t), true, t)
})

// ── KHÔNG được gọi là cấp shop ────────────────────────────────────
//
// ⚠️ Đây là phần quan trọng hơn. Tất cả tiêu đề dưới đây đều thuộc nhóm 181
// offer mà NGƯỜI THẬT đã ngồi gắn link sản phẩm — chúng chắc chắn trỏ được.
// Hàm nào gọi chúng là "cấp shop" thì hàm đó quá tay và sẽ giấu mất việc thật.

test('⚠️ THẬT: tiêu đề trỏ được sản phẩm KHÔNG bị gọi là cấp shop', () => {
  for (const t of [
    '2X Custom LED Cup Holder Lights – Save $10',
    'Comfy Corduroy Indoor Slippers - 50% Off',
    'K-Pop Soccer Jerseys – 61% Off',
    'Dark Spot Routine Duo – 20% Off',
    'Aespa and Twice Flag Tapestries – Save $30',
    'Build Your Own Keyboard Kits – 20% Off',
    'Featured Handmade Jewelry – 50% Off',
  ]) assert.equal(isStoreWideOffer(t), false, t)
})

test('chuỗi rỗng coi là cấp shop — không có gì để đối chiếu', () => {
  assert.equal(isStoreWideOffer(''), true)
  assert.equal(isStoreWideOffer('   '), true)
})

// ── isLinkableOffer: phải đạt CẢ HAI điều kiện ────────────────────
test('isLinkableOffer cần cả đủ từ có nghĩa lẫn không phải cấp shop', () => {
  // đủ từ, không phải cấp shop -> trỏ được
  assert.equal(isLinkableOffer('K-Pop Soccer Jerseys – 61% Off', 3), true)
  // đủ từ nhưng là cấp shop -> KHÔNG
  assert.equal(isLinkableOffer('Free shipping on all orders', 3), false)
  // không phải cấp shop nhưng quá ít từ -> KHÔNG (không có gì để đối chiếu)
  assert.equal(isLinkableOffer('Sale', 1), false)
})
