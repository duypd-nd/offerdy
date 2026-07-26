/**
 * Ghep gia doc tu trang san pham thanh chuoi hien thi.
 *
 * Cac gia tri duoi day lay tu lan do that 3 shop cua du an (2026-07-26):
 * Kyokuknives tra "28.99"/USD, Cycleaddons tra "399.00"/USD, Consistentderma khong
 * phat gia nao.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatScrapedPrice } from '@/lib/scrapedPrice'

test('gia that tu shop -> chuoi co ky hieu', () => {
  assert.equal(formatScrapedPrice('28.99', 'USD'), '$28.99')
  // "399.00" la so nguyen -> bo .00 cho de doc
  assert.equal(formatScrapedPrice('399.00', 'USD'), '$399')
})

test('khong lam tron phan thap phan that', () => {
  assert.equal(formatScrapedPrice('1297.79', 'USD'), '$1297.79')
})

test('khong co gia -> undefined (de nguoi van hanh tu nhap)', () => {
  assert.equal(formatScrapedPrice(undefined, 'USD'), undefined)
  assert.equal(formatScrapedPrice('', 'USD'), undefined)
})

test('gia rac / bang 0 -> undefined chu khong ra "$0"', () => {
  assert.equal(formatScrapedPrice('lien he', 'USD'), undefined)
  assert.equal(formatScrapedPrice('0', 'USD'), undefined)
  assert.equal(formatScrapedPrice('0.00', 'USD'), undefined)
})

test('bo ky hieu va dau phay ngan cach nghin san co', () => {
  assert.equal(formatScrapedPrice('$1,299.00', 'USD'), '$1299')
})

test('cac tien te khac co ky hieu rieng', () => {
  assert.equal(formatScrapedPrice('49', 'EUR'), '€49')
  assert.equal(formatScrapedPrice('49', 'GBP'), '£49')
  assert.equal(formatScrapedPrice('250000', 'VND'), '₫250000')
})

test('khong biet ky hieu -> ghi MA tien te, KHONG mac dinh thanh $', () => {
  // Hien sai don vi tien te la sai thong tin gia.
  assert.equal(formatScrapedPrice('49', 'SEK'), 'SEK 49')
})

test('thieu ma tien te -> undefined, KHONG doan la USD', () => {
  // Du an co deal ban bang IDR (#1016: Rp4.961.899). Doan "$" la gan sai don vi
  // tien te, tuc mot con so gia sai in tren moi bai dang.
  assert.equal(formatScrapedPrice('49'), undefined)
  assert.equal(formatScrapedPrice('4961899'), undefined)
})

test('IDR co ma thi van dinh dang duoc', () => {
  assert.equal(formatScrapedPrice('4961899', 'IDR'), 'IDR 4961899')
})
