/**
 * Gioi han do dai tieu de — tinh CA phan duoi ma `titleTemplate` gan vao.
 *
 * Cac gia tri trong file nay lay tu production that ngay 2026-08-03: mau dang
 * dung la `%s | Offerdy - Real Deals. Verified`, va bai review flashfish co
 * tieu de goc 104 ky tu, nhan 299 luot hien o vi tri 8.2 ma KHONG ra click nao.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titleSuffixLength, auditReviews, TITLE_LIMIT } from '@/lib/seoAudit'

const LIVE_TEMPLATE = '%s | Offerdy - Real Deals. Verified'

test('titleSuffixLength: dem phan co dinh, bo %s', () => {
  assert.equal(titleSuffixLength(LIVE_TEMPLATE), 33)
  assert.equal(titleSuffixLength('%s | Offerdy'), 10)
  assert.equal(titleSuffixLength('%s'), 0)
})

test('titleSuffixLength: khong co mau -> 0, khong nem loi', () => {
  assert.equal(titleSuffixLength(undefined), 0)
  assert.equal(titleSuffixLength(''), 0)
})

const review = (title: string) => [{ id: 'r1', title, slug: 'r', excerpt: 'x'.repeat(60), hasImage: true }]
const longTitles = (issues: { type: string }[]) => issues.filter(i => i.type === 'long_meta_title').length

test('bai review that: 103 ky tu + duoi 33 -> vuot nguong', () => {
  const flashfish = 'FlashFish Portable Power Station Review 2026: Compact Backup Power for Camping, RVs and Home Essentials'
  assert.equal(flashfish.length, 103)
  assert.equal(longTitles(auditReviews(review(flashfish), 33)), 1)
})

test('CHINH tieu de do, chi rut ngan phan duoi thi VAN vuot — khong bao "da xong" sai', () => {
  const flashfish = 'FlashFish Portable Power Station Review 2026: Compact Backup Power for Camping, RVs and Home Essentials'
  // Doi mau sang "%s | Offerdy" (10 ky tu) van khong cuu duoc tieu de 103 ky tu
  assert.equal(longTitles(auditReviews(review(flashfish), 10)), 1)
})

test('phan duoi la thu quyet dinh voi tieu de do dai vua phai', () => {
  const title = 'Dasaita Car Stereo Review 2026: Best Android Head Units'  // 55
  assert.equal(title.length, 55)
  // 55 + 33 = 88 -> vuot
  assert.equal(longTitles(auditReviews(review(title), 33)), 1)
  // 55 + 10 = 65 -> van vuot 60 mot chut
  assert.equal(longTitles(auditReviews(review(title), 10)), 1)
  // 55 + 0 = 55 -> dat
  assert.equal(longTitles(auditReviews(review(title), 0)), 0)
})

test('dung bang gioi han thi KHONG bao', () => {
  const title = 'x'.repeat(TITLE_LIMIT - 10)
  assert.equal(longTitles(auditReviews(review(title), 10)), 0)
  assert.equal(longTitles(auditReviews(review(title + 'y'), 10)), 1)
})

test('khong truyen do dai duoi -> mac dinh 0, khong bao dong gia', () => {
  const title = 'Dasaita Car Stereo Review 2026: Best Android Head Units'
  assert.equal(longTitles(auditReviews(review(title))), 0)
})

test('review co metaTitle ngan -> KHONG bao, du title bai viet rat dai', () => {
  // Trang /reviews/[slug] dung `metaTitle ?? title` lam <title> (generateMetadata),
  // nen kiem `title` khong thoi se bao dong nham cho bai da duoc dat metaTitle dung.
  const long = 'FlashFish Portable Power Station Review 2026: Compact Backup Power for Camping, RVs and Home Essentials'
  const withMeta = [{ id: 'r1', title: long, slug: 'r', excerpt: 'x'.repeat(60), hasImage: true, metaTitle: 'FlashFish Power Station Review 2026' }]
  assert.equal(longTitles(auditReviews(withMeta, 10)), 0)
})

test('review metaTitle cung qua dai -> van bao', () => {
  const withMeta = [{ id: 'r1', title: 'ngan', slug: 'r', excerpt: 'x'.repeat(60), hasImage: true, metaTitle: 'y'.repeat(55) }]
  assert.equal(longTitles(auditReviews(withMeta, 10)), 1)
})
