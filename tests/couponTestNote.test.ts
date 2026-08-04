import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasPhrase, togglePhrase, NOTE_PHRASES } from '@/lib/couponTestNote'

test('bam mot cau mau vao ghi chu rong', () => {
  assert.equal(togglePhrase('', 'new customers only'), 'new customers only')
})

test('bam them cau thu hai thi noi vao cuoi, khong de mat cau dau', () => {
  const a = togglePhrase('', 'no minimum order required')
  assert.equal(togglePhrase(a, 'not valid on sale items'), 'no minimum order required, not valid on sale items')
})

test('bam lai chinh cau do thi go ra, khong nhan doi', () => {
  const a = togglePhrase('', 'new customers only')
  assert.equal(togglePhrase(a, 'new customers only'), '')
})

test('go mot cau o giua thi hai cau con lai van dung thu tu', () => {
  let n = ''
  for (const p of ['no minimum order required', 'new customers only', 'code had expired']) n = togglePhrase(n, p)
  assert.equal(togglePhrase(n, 'new customers only'), 'no minimum order required, code had expired')
})

test('chu nguoi dung tu go duoc giu nguyen khi bam cau mau', () => {
  assert.equal(
    togglePhrase('10% off applied at checkout', 'new customers only'),
    '10% off applied at checkout, new customers only',
  )
})

test('go cau mau thi phan tu go van con', () => {
  const n = togglePhrase('10% off applied at checkout', 'new customers only')
  assert.equal(togglePhrase(n, 'new customers only'), '10% off applied at checkout')
})

/**
 * Bay that: "minimum order required" la chuoi con cua "no minimum order
 * required". Neu hasPhrase dung includes() tren ca chuoi thi chon cai phu dinh se
 * lam cai khang dinh SANG DEN theo — hai o doi nghia nhau cung bao la dang chon.
 */
test('cau phu dinh KHONG lam cau khang dinh sang den theo', () => {
  const n = togglePhrase('', 'no minimum order required')
  assert.equal(hasPhrase(n, 'no minimum order required'), true)
  assert.equal(hasPhrase(n, 'minimum order required'), false)
})

test('go cau phu dinh khong an nham cau khang dinh nam canh', () => {
  let n = togglePhrase('', 'minimum order required')
  n = togglePhrase(n, 'not valid on sale items')
  assert.equal(togglePhrase(n, 'minimum order required'), 'not valid on sale items')
})

test('ghi chu rong thi khong cau mau nao duoc chon', () => {
  for (const p of NOTE_PHRASES) assert.equal(hasPhrase('', p), false)
})

test('dau phay thua va khoang trang khong sinh ra manh rong', () => {
  assert.equal(togglePhrase('a,  , b', 'new customers only'), 'a, b, new customers only')
})

test('cau mau deu la tieng Anh — chung in ra trang public cho nguoi mua doc', () => {
  // Khong ky tu co dau tieng Viet nao duoc lot vao day.
  for (const p of NOTE_PHRASES) {
    assert.ok(!/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(p), `"${p}" co dau tieng Viet`)
  }
})
