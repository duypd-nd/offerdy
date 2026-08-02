/**
 * Rut tu khoa tu duong dan 404, de trang "Page Not Found" goi y duoc thu con song.
 *
 * Cac duong dan trong file nay lay TU THAT: do ngay 2026-08-03 qua Search Console,
 * day dung la nhung URL da xoa ma Google van xep hang va van dang gui khach toi
 * (24 trong 28 luot bam cua ca thang).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugKeywords, slugLabel, matchesKeyword } from '@/lib/slugKeywords'

test('matchesKeyword: chuoi con GIUA tu khong tinh la khop', () => {
  // Ca that gap ngay khi chay thu: /stores/pollo-ai duoc goi y "Apollo Moda"
  // chi vi "apollo moda" chua "pollo". Mot goi y sai te hon la khong goi y.
  assert.equal(matchesKeyword('Apollo Moda', 'pollo'), false)
  assert.equal(matchesKeyword('EPZ Audio', 'audio'), true)
  assert.equal(matchesKeyword('Marina Boats', 'marina'), true)
})

test('matchesKeyword: khop tu dau tu, ke ca khi ten dai hon tu khoa', () => {
  assert.equal(matchesKeyword('Inflatable Kayak Store', 'inflatable'), true)
  assert.equal(matchesKeyword('Running Shoes Depot', 'running'), true)
  assert.equal(matchesKeyword('Nike Store', 'running'), false)
})

test('matchesKeyword: tu khoa dai hon nhung ten la tien to du dai', () => {
  // "audio" tim thay "Audiobook" — chap nhan duoc; nhung khong duoc khop tu qua ngan
  assert.equal(matchesKeyword('Audiobooks Plus', 'audio'), true)
  assert.equal(matchesKeyword('AI Song Maker', 'aisong'), false)
})

test('matchesKeyword: tu khoa rong -> false', () => {
  assert.equal(matchesKeyword('Bất Kỳ', ''), false)
  assert.equal(matchesKeyword('Bất Kỳ', '   '), false)
})

test('matchesKeyword: bo dau tieng Viet truoc khi so khop', () => {
  // Slug luon khong dau, con ten shop trong Sanity co the co dau
  assert.equal(matchesKeyword('Cà Phê Sữa', 'phe'), true)
  assert.equal(matchesKeyword('Đồ Chơi Trẻ Em', 'choi'), true)
})

test('bo doan loai noi dung, giu ten that', () => {
  assert.deepEqual(slugKeywords('/stores/pollo-ai'), ['pollo'])
  assert.deepEqual(slugKeywords('/stores/epz-audio'), ['audio', 'epz'])
})

test('URL review dai: uu tien tu dac trung, bo tu chung cua nganh', () => {
  const kw = slugKeywords('/reviews/beyond-marina-review-2026-best-inflatable-kayaks-paddle-boards-dinghies-cold-plunge-tubs--more')
  // "review", "best", "more" la stopword; "2026" la nam -> phai bien mat
  assert.ok(!kw.includes('review'))
  assert.ok(!kw.includes('best'))
  assert.ok(!kw.includes('2026'))
  // Tu dac trung nhat phai len dau
  assert.equal(kw[0], 'inflatable')
})

test('bo nam va so don le', () => {
  assert.deepEqual(slugKeywords('/reviews/nike-vs-adidas-running-shoes-2026'), ['running', 'adidas', 'shoes'])
})

test('tu chung cua nganh bi loai het -> mang rong chu khong tra ve rac', () => {
  assert.deepEqual(slugKeywords('/blog/how-to-stack-coupons-for-maximum-savings').includes('coupons'), false)
  assert.deepEqual(slugKeywords('/stores/best-deals-coupon-codes'), [])
})

test('duong dan khong co doan noi dung nao -> mang rong', () => {
  assert.deepEqual(slugKeywords('/stores'), [])
  assert.deepEqual(slugKeywords('/'), [])
  assert.deepEqual(slugKeywords(''), [])
})

test('bo tu trung lap, giu lan xuat hien dau', () => {
  assert.deepEqual(slugKeywords('/stores/marina-marina-boats'), ['marina', 'boats'])
})

test('gioi han so tu khoa tra ve', () => {
  const kw = slugKeywords('/reviews/ultrafire-tactical-flashlights-hunting-beams-camping-lantern')
  assert.equal(kw.length, 3)
})

test('slugLabel: nhan doc duoc cho nguoi dung, giu nguyen thu tu', () => {
  assert.equal(slugLabel('/stores/pollo-ai'), 'Pollo Ai')
  assert.equal(slugLabel('/stores/epz-audio'), 'Epz Audio')
  // Giu ca tu chung vi day la de HIEN THI, va cat bot cho khoi dai
  assert.equal(slugLabel('/reviews/nike-vs-adidas-running-shoes-2026'), 'Nike Vs Adidas Running Shoes 2026')
})

test('slugLabel: duong dan rong -> chuoi rong', () => {
  assert.equal(slugLabel('/'), '')
  assert.equal(slugLabel('/stores'), '')
})
