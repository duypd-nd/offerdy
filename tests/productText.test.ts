/**
 * Chon va lam sach mo ta san pham.
 *
 * Ca that o duoi: tennail.com in "Ombré" dung 15 lan va HONG 4 lan thanh "Ombr¨¦"
 * trong cung mot trang — du lieu cua shop hong san, khong phai loi giai ma cua minh.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bestDescription, repairDoubleEncoded } from '@/lib/productText'

// "é" ma hoa GBK (A8 A6) roi doc nhu latin1
const MOJIBAKE = 'Cat Eye Ombr¨¦ effect with 3D floral detail'
const FIXED = 'Cat Eye Ombré effect with 3D floral detail'

test('sua duoc van ban ma hoa hai lan (GBK doc nhu latin1)', () => {
  assert.equal(repairDoubleEncoded(MOJIBAKE), FIXED)
})

test('van ban sach di qua khong bi dung toi', () => {
  for (const t of ['Plain ASCII text', 'Đã có dấu tiếng Việt', 'Café au lait', '800W 48V 15Ah']) {
    assert.equal(repairDoubleEncoded(t), t)
  }
})

test('co ky tu ngoai latin1 -> KHONG thu sua (tranh lam mat du lieu)', () => {
  // Vua co dau hieu hong vua co chu ngoai U+00FF: giai nguoc se pha chu kia.
  const mixed = 'Ombr¨¦ — kem dưỡng da 🌸'
  assert.equal(repairDoubleEncoded(mixed), mixed)
})

test('chon ban DAI khi ca hai deu sach', () => {
  const short = 'Short meta summary of the product.'
  const long = 'Full body description. '.repeat(20)
  assert.equal(bestDescription([short, long])?.startsWith('Full body'), true)
})

test('uu tien ban SACH hon ban dai nhung hong — sau khi da thu sua', () => {
  // Ban dai bi hong nhung sua duoc -> phai chon ban dai DA SUA, khong phai ban ngan.
  const clean = 'Clean but short.'
  const dirtyLong = MOJIBAKE + ' ' + 'more real detail here.'.repeat(5)
  const out = bestDescription([clean, dirtyLong])!
  assert.ok(out.length > clean.length, 'phai lay ban dai')
  assert.ok(out.includes('Ombré'), 'va phai da duoc sua loi ma')
  assert.ok(!out.includes('Ombr¨¦'))
})

test('bo nhan "Description" cua tab WooCommerce', () => {
  assert.equal(bestDescription(['Description Our face cream nourishes skin.']), 'Our face cream nourishes skin.')
})

test('gop khoang trang, bo trang, rong -> undefined', () => {
  assert.equal(bestDescription([undefined, '', '   ']), undefined)
  assert.equal(bestDescription(['a\n\n  b   c']), 'a b c')
})

test('cat o 4000 ky tu de prompt khong phinh vo han', () => {
  assert.equal(bestDescription(['x'.repeat(9000)])?.length, 4000)
})
