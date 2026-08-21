/**
 * Ten san pham cua bai review.
 *
 * Ham nay chay tren du lieu co cau truc ma Google doc, nen sai o day khong bao
 * loi o dau ca — no chi lam giam chat luong khop san pham mot cach im lang.
 * Test o day nghieng ve phia "KHONG duoc cat nham": tha de ten hoi dai con hon
 * cat mat mot chu thuoc ve chinh san pham.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveProductName, productNameOf } from '../src/lib/reviewProductName'

// ── Truong hop that ────────────────────────────────────────────────
test('cat duoi "Review" o cuoi', () => {
  assert.equal(
    deriveProductName(`6'8" New School Model Fun Shape Surfboard Review`),
    `6'8" New School Model Fun Shape Surfboard`,
  )
})

test('cat duoi co dau gach ngang dai', () => {
  assert.equal(deriveProductName('Dowinx Gaming Chair — Review'), 'Dowinx Gaming Chair')
  assert.equal(deriveProductName('Dowinx Gaming Chair - Review'), 'Dowinx Gaming Chair')
  assert.equal(deriveProductName('Dowinx Gaming Chair: Review'), 'Dowinx Gaming Chair')
})

test('cat duoi nam trong ngoac, ke ca khi co nam', () => {
  assert.equal(deriveProductName('Cloud Cushion Slides (Review)'), 'Cloud Cushion Slides')
  assert.equal(deriveProductName('Cloud Cushion Slides (2026 Review)'), 'Cloud Cushion Slides')
  assert.equal(deriveProductName('Cloud Cushion Slides [Review]'), 'Cloud Cushion Slides')
})

test('khong phan biet hoa thuong', () => {
  assert.equal(deriveProductName('Frolk Whiskey Set REVIEW'), 'Frolk Whiskey Set')
  assert.equal(deriveProductName('Frolk Whiskey Set review'), 'Frolk Whiskey Set')
})

test('cat duoc duoi tieng Viet va vai duoi thuong gap khac', () => {
  assert.equal(deriveProductName('Ghế công thái học — Đánh giá'), 'Ghế công thái học')
  assert.equal(deriveProductName('Anker PowerCore Hands-on'), 'Anker PowerCore')
  assert.equal(deriveProductName('Anker PowerCore First Look'), 'Anker PowerCore')
})

// ── Nhung thu KHONG duoc dung toi ─────────────────────────────────
test('⚠️ chu "review" GIUA cau khong bi dung toi', () => {
  // Neu cat o giua thi mat han phan duoi cua ten san pham.
  assert.equal(deriveProductName('Surfboard Review Deck Pro'), 'Surfboard Review Deck Pro')
})

test('⚠️ "Preview" / "Overview" khong bi cat mat "view"', () => {
  assert.equal(deriveProductName('Anker Charger Preview'), 'Anker Charger Preview')
  assert.equal(deriveProductName('Anker Charger Overview'), 'Anker Charger Overview')
})

test('⚠️ chi cat MOT lan, khong an mon dan', () => {
  // Cat lap se bien cai nay thanh "Test" roi thanh chuoi rong.
  assert.equal(deriveProductName('Test Kitchen Review'), 'Test Kitchen')
})

test('⚠️ cat xong ma qua ngan thi giu nguyen tieu de', () => {
  // "Go Review" -> "Go" chi con 2 ky tu: gan nhu chac chan da cat nham.
  assert.equal(deriveProductName('Go Review'), 'Go Review')
})

test('tieu de khong co duoi nao thi giu nguyen', () => {
  assert.equal(deriveProductName('IBIZ Jewel Lab Diamond Ring'), 'IBIZ Jewel Lab Diamond Ring')
})

test('chuoi rong va khoang trang', () => {
  assert.equal(deriveProductName(''), '')
  assert.equal(deriveProductName('   '), '')
})

// ── Thu tu uu tien ────────────────────────────────────────────────
test('productName do nguoi nhap LUON thang phan suy ra', () => {
  assert.equal(
    productNameOf({ productName: 'Fulcrum Fun Board 7.0', title: 'Some Other Title Review' }),
    'Fulcrum Fun Board 7.0',
  )
})

test('productName de trong hoac chi khoang trang thi rot ve suy ra', () => {
  assert.equal(productNameOf({ productName: '', title: 'Dowinx Chair Review' }), 'Dowinx Chair')
  assert.equal(productNameOf({ productName: '   ', title: 'Dowinx Chair Review' }), 'Dowinx Chair')
  assert.equal(productNameOf({ title: 'Dowinx Chair Review' }), 'Dowinx Chair')
})
