/**
 * Chon bai cho o ben canh bai dang doc.
 *
 * Ca dat cuoc: **o do phai biet nguoi doc dang doc gi**. Ban cu ("Recent Posts") hien
 * y het nhau tren moi trang bai, nen mot nguoi dang chon do boi cho em be bi moi doc
 * bai ve may loc nuoc. Moi assertion duoi day la mot cach danh sach do co the tro lai
 * thanh vo nghia.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickSidebarPosts, scoreRelated, type RelatablePost } from '@/lib/relatedPosts'

const current: RelatablePost = {
  slug: 'best-baby-zip-swim-rompers-at-babywonders',
  title: 'Best Baby Zip Swim Rompers at Babywonders (2026)',
  category: 'Comparison',
  storeSlug: 'babywonders',
}

// Thu tu nay la thu tu `getPosts` tra ve: moi dang truoc.
const all: RelatablePost[] = [
  { slug: 'frizzlife-ro', title: 'Which Frizzlife Tankless RO System Should You Buy? (2026)', category: 'Comparison', storeSlug: 'frizzlife' },
  { slug: 'oversized-tee', title: 'Best Oversized TEE at Apollo Moda (2026)', category: 'Comparison', storeSlug: 'apollo-moda' },
  { slug: 'lace-baby-socks', title: 'Best Lace Baby Socks at Babywonders (2026)', category: 'Comparison', storeSlug: 'babywonders' },
  { slug: 'nail-tpo', title: 'Best 8BELLE Nail TPO at 8Belleusa (2026)', category: 'Comparison', storeSlug: '8belleusa' },
  { slug: 'baby-gift-guide', title: 'A Baby Shower Gift Guide', category: 'Tips & Guides' },
]

test('⚠️ cung shop len dau — do la nguoi con dang trong cung mot con mua sam', () => {
  const { related } = pickSidebarPosts(current, all)
  assert.equal(related[0].slug, 'lace-baby-socks')
})

test('bai dang doc khong bao gio tu tro ve chinh no', () => {
  const { related, recent } = pickSidebarPosts(current, [current, ...all])
  assert.ok(![...related, ...recent].some(p => p.slug === current.slug))
  assert.equal(scoreRelated(current, current), 0)
})

test('⚠️ CUNG DANH MUC mot minh khong phai la lien quan', () => {
  // Luong sinh bai AI dat MOI bai vao "Comparison". Tinh danh muc thanh diem thi son
  // mong tay "lien quan" toi do boi em be, va o ben canh lai thanh ngau nhien.
  const nail = { slug: 'n', title: 'Best 8BELLE Nail TPO at 8Belleusa (2026)', category: 'Comparison', storeSlug: '8belleusa' }
  assert.equal(scoreRelated(current, nail), 0)
})

test('⚠️ tu chung cua tieu de khong duoc tinh la lien quan', () => {
  // Kho bai nay tieu de nao cung la "Best ... at ... (2026)". Tinh nhung tu do thi
  // moi bai deu "lien quan" voi moi bai, va danh sach tro lai thanh ngau nhien.
  const a = { slug: 'a', title: 'Best Oversized TEE at Apollo Moda (2026)' }
  const b = { slug: 'b', title: 'Best Nail TPO at 8Belleusa (2026)' }
  assert.equal(scoreRelated(a, b), 0)
})

test('trung tu that trong tieu de thi co tinh', () => {
  const a = { slug: 'a', title: 'Best Baby Zip Swim Rompers at Babywonders (2026)' }
  const b = { slug: 'b', title: 'Best Lace Baby Socks at Babywonders (2026)' }
  assert.ok(scoreRelated(a, b) > 0, '"baby" và "babywonders" là từ thật của chủ đề')
})

test('⚠️ tieu de dai le the khong duoc vuot mat mot bai CUNG SHOP', () => {
  const sameStore = { slug: 'x', title: 'Something Else Entirely', storeSlug: 'babywonders' }
  const wordy = {
    slug: 'y',
    // Nhoi that nhieu tu trung: baby, zip, swim, rompers...
    title: 'Baby Zip Swim Rompers, Swim Rompers and More Baby Swim Zip Rompers',
    category: 'Comparison',
  }
  assert.ok(scoreRelated(current, sameStore) > scoreRelated(current, wordy))
})

test('diem bang nhau -> giu thu tu dau vao (bai moi hon truoc)', () => {
  const older = { slug: 'older', title: 'Baby Socks at Babywonders', storeSlug: 'babywonders' }
  const newer = { slug: 'newer', title: 'Baby Hats at Babywonders', storeSlug: 'babywonders' }
  const { related } = pickSidebarPosts(current, [newer, older])
  assert.deepEqual(related.map(p => p.slug), ['newer', 'older'])
})

test('⚠️ khong co bai lien quan nao -> o "Related" BIEN MAT, khong doi bai vao cho day', () => {
  const lonely: RelatablePost = { slug: 'z', title: 'Kettle Descaling Explained', category: 'News' }
  const others = [
    { slug: 'a', title: 'Best Oversized TEE at Apollo Moda (2026)', category: 'Comparison' },
    { slug: 'b', title: 'Best Nail TPO at 8Belleusa (2026)', category: 'Comparison' },
  ]
  const { related, recent } = pickSidebarPosts(lonely, others)
  assert.equal(related.length, 0, 'để chữ "Related" trên danh sách không liên quan là nói dối')
  assert.equal(recent.length, 2, 'cột bên trống trơn còn tệ hơn — vẫn phải có lối đi tiếp')
})

test('⚠️ bai lien quan it -> o duoi do NOT cho trong, khong bo cot ben gan nhu trong', () => {
  // Do that tren kho bai hien tai: Babywonders chi co dung 2 bai, nen o "Related" chi
  // ra MOT the va phan con lai cua cot la khoang trang.
  const { related, recent } = pickSidebarPosts(current, all)
  assert.deepEqual(related.map(p => p.slug), ['lace-baby-socks', 'baby-gift-guide'])
  assert.equal(related.length + recent.length, 5, 'lấp đủ 5 bài còn lại, không bỏ phí chỗ')
  // Nhung bai khong lien quan chi duoc nam o o DUOI, dung ten that cua no.
  assert.ok(recent.some(p => p.slug === 'nail-tpo'))
  assert.ok(!related.some(p => p.slug === 'nail-tpo'), 'sơn móng không liên quan gì tới đồ bơi em bé')
  // Khong bai nao hien hai lan o hai o.
  assert.equal(new Set([...related, ...recent].map(p => p.slug)).size, 5)
})

test('bai cu khong co sourceStore van xep duoc theo chu de', () => {
  const legacy = { slug: 'g', title: 'A Baby Shower Gift Guide', category: 'Tips & Guides' }
  assert.ok(scoreRelated(current, legacy) > 0, '"baby" vẫn là điểm chung thật')
})

test('gioi han so bai tra ve', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    slug: `p${i}`, title: `Baby Swim Rompers ${i}`, storeSlug: 'babywonders',
  }))
  const six = pickSidebarPosts(current, many)
  assert.equal(six.related.length, 6)
  assert.equal(six.recent.length, 0, 'đủ bài liên quan rồi thì không cần ô thứ hai')
  assert.equal(pickSidebarPosts(current, many, 3).related.length, 3)
})
