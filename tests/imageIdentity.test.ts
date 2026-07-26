/**
 * Nhan dang anh trung nhau du URL khac nhau.
 *
 * Ca that o duoi lay tu cycleaddons.com (2026-07-26): 3 URL, cung MOT tam anh —
 * khac host (CDN Jetpack) va khac tham so kich thuoc. Truoc khi co file nay, nguoi
 * van hanh nhan 3 o tick trong y het nhau trong form Them Review.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageKey, dedupeImageUrls } from '@/lib/imageIdentity'

const SAME = [
  'https://cycleaddons.com/wp-content/uploads/2026/07/b9f076ad-f7c4-46fb-80d9-65a1d9788638.jpg',
  'https://i0.wp.com/cycleaddons.com/wp-content/uploads/2026/07/b9f076ad-f7c4-46fb-80d9-65a1d9788638.jpg',
  'https://i0.wp.com/cycleaddons.com/wp-content/uploads/2026/07/b9f076ad-f7c4-46fb-80d9-65a1d9788638.jpg?fit=1024%2C1024&ssl=1',
]

test('LOI THAT: 3 URL cua cung mot tam anh gom lai con 1', () => {
  assert.equal(dedupeImageUrls(SAME).length, 1)
  // Giu ban DAU TIEN (nguoi goi da xep thu vien san pham len truoc)
  assert.equal(dedupeImageUrls(SAME)[0], SAME[0])
})

test('cung khoa cho ca 3 dang URL', () => {
  const keys = new Set(SAME.map(imageKey))
  assert.equal(keys.size, 1)
})

test('anh THAT khac nhau thi khong bi gom', () => {
  const distinct = [
    'https://tennail.com/cdn/shop/files/T2511N070_Nails.jpg?v=1764',
    'https://tennail.com/cdn/shop/files/T2511N070_Nails_1.jpg?v=1764',
    'https://tennail.com/cdn/shop/files/T2511N070_Nails_2.jpg?v=1764',
    'https://tennail.com/cdn/shop/files/Complimentary_Toolkit.jpg?v=1764',
  ]
  assert.equal(dedupeImageUrls(distinct).length, 4)
})

test('bo hau to kich thuoc cua WordPress va Shopify', () => {
  assert.equal(imageKey('https://s.com/a/face-cream-1024x1024.jpeg'), imageKey('https://s.com/b/face-cream.jpeg'))
  assert.equal(imageKey('https://s.com/x_500x.jpg'), imageKey('https://s.com/x.jpg'))
  assert.equal(imageKey('https://s.com/x_grande.jpg'), imageKey('https://s.com/x.jpg'))
})

test('KHONG cat phan giong hau to nam giua ten', () => {
  // "_2x" o giua ten khong phai kich thuoc do CMS them
  assert.notEqual(imageKey('https://s.com/iphone_2x_case.jpg'), imageKey('https://s.com/iphone_case.jpg'))
})

test('tham so query khong lam anh thanh "khac nhau"', () => {
  assert.equal(
    imageKey('https://s.com/p.jpg?v=1&width=500'),
    imageKey('https://s.com/p.jpg')
  )
})

test('bo gia tri rong / undefined, va ton trong gioi han', () => {
  assert.deepEqual(dedupeImageUrls([undefined, '', '   ']), [])
  const many = Array.from({ length: 20 }, (_, i) => `https://s.com/p${i}.jpg`)
  assert.equal(dedupeImageUrls(many).length, 8)
  assert.equal(dedupeImageUrls(many, 3).length, 3)
})

test('URL khong hop le van xu ly duoc, khong nem loi', () => {
  assert.deepEqual(dedupeImageUrls(['khong-phai-url.jpg?x=1']), ['khong-phai-url.jpg?x=1'])
})
