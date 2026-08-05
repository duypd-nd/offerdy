/**
 * Hau kiem ten bai do AI dat — lop bao ve doc lap voi prompt.
 *
 * Ca dat cuoc nang nhat o duoi cung: mot tieu de neu dich danh mot thuong hieu site
 * khong ban. Do la su co `/about` (15 thuong hieu ma khong cai nao ton tai trong
 * Sanity) lap lai o dang nguy hiem hon, vi tieu de la thu Google doc va hien ra ket
 * qua tim kiem.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findUnsafeIdea, findUnsafeMetaTitle, META_TITLE_MAX, type IdeaNameContext } from '@/lib/ai/nameArticleIdeas'

const ctx: IdeaNameContext = {
  storeName: 'Frizzlife',
  productTitles: [
    'Frizzlife PD600-TAM3 600GPD Tankless Reverse Osmosis Water Filter System',
    'Frizzlife PX600 600GPD Tankless Reverse Osmosis Water Filter System',
    'Frizzlife PD1000-N 1000GPD Reverse Osmosis Water Filter System',
  ],
  year: 2026,
  productCount: 3,
}

test('tieu de dung tu trong ten san pham nguon -> qua', () => {
  assert.equal(findUnsafeIdea('Best Tankless Reverse Osmosis Systems at Frizzlife 2026', ctx), null)
  assert.equal(findUnsafeIdea('Frizzlife PD600 vs PX600: Which Water Filter to Buy', ctx), null)
})

test('so it/so nhieu khong bi bat oan', () => {
  // Nguon viet "Filter", tieu de viet "Filters" — cung mot tu.
  assert.equal(findUnsafeIdea('Best Water Filters at Frizzlife', ctx), null)
})

test('viet tat cua cum CO THAT trong nguon thi dung duoc', () => {
  // Nguon ghi day du "Reverse Osmosis" -> `RO` truy nguoc duoc. Chan no la bao dong
  // gia, va metaTitle chi co 50 ky tu nen viet tat gan nhu bat buoc.
  assert.equal(findUnsafeIdea('Best RO Systems at Frizzlife 2026', ctx), null)
})

test('⚠️ viet tat KHONG duoc mo duong cho thuong hieu la', () => {
  // Tu vung sinh tu ten san pham cua CHINH bai nay, khong tu ca danh muc shop.
  // Mot shop nhac "replaces Waterdrop WD-G3" o san pham khac khong duoc bien
  // "Waterdrop" thanh tu hop le o day.
  assert.match(findUnsafeIdea('Best WD Filters at Frizzlife', ctx) ?? '', /"wd"/)
})

test('⚠️ THUONG HIEU KHONG CO TRONG NGUON bi chan', () => {
  const p = findUnsafeIdea('Frizzlife vs Waterdrop: Best Reverse Osmosis 2026', ctx)
  assert.match(p ?? '', /waterdrop/)
  assert.match(p ?? '', /không truy ngược được/)
})

test('chan ca chung nhan va tieu chuan tu nghi ra', () => {
  assert.match(findUnsafeIdea('NSF Certified Water Filter Systems at Frizzlife', ctx) ?? '', /"nsf"/)
})

test('chan loi hua khong kiem chung duoc', () => {
  // "cheapest" khong nam trong nguon lan danh sach lien tu — khong ai do gia thi truong.
  assert.match(findUnsafeIdea('Cheapest Reverse Osmosis Filter at Frizzlife', ctx) ?? '', /"cheapest"/)
  assert.match(findUnsafeIdea('We Tested Every Frizzlife Water Filter', ctx) ?? '', /"tested"/)
})

test('chan chu Offerdy — titleTemplate da noi hau to roi', () => {
  assert.match(findUnsafeIdea('Best Water Filters at Frizzlife | Offerdy', ctx) ?? '', /Offerdy/)
})

test('⚠️ so luong trong tieu de phai khop so san pham that', () => {
  // Bai co 3 san pham ma tieu de bao 5 -> khai sai ve chinh noi dung bai.
  assert.match(findUnsafeIdea('The 5 Best Water Filters at Frizzlife', ctx) ?? '', /số sản phẩm của bài \(3\)/)
  assert.equal(findUnsafeIdea('The 3 Best Water Filters at Frizzlife', ctx), null)
})

test('so co san trong ten san pham thi dung duoc', () => {
  // 600 va 1000 nam trong ten san pham nguon.
  assert.equal(findUnsafeIdea('Frizzlife 600 vs 1000 GPD Water Filter', ctx), null)
})

test('nam phai la nam nay hoac nam sau', () => {
  assert.equal(findUnsafeIdea('Best Water Filters at Frizzlife 2027', ctx), null)
  assert.match(findUnsafeIdea('Best Water Filters at Frizzlife 2024', ctx) ?? '', /không phải năm nay/)
})

test('⚠️ bai "tot nhat trong shop" KHONG duoc bo ten shop', () => {
  // Bo "at Frizzlife" la bien "tot nhat trong nhung gi shop nay ban" thanh "tot nhat
  // tren thi truong" — dung loai hua hao ma cong kiem sinh ra de chan.
  const scoped = { ...ctx, mustNameStore: true }
  assert.match(findUnsafeIdea('Best Reverse Osmosis Water Filters 2026', scoped) ?? '', /bỏ mất tên shop/)
  assert.equal(findUnsafeIdea('Best Reverse Osmosis Water Filters at Frizzlife 2026', scoped), null)
})

test('tieu de rong bi tu choi', () => {
  assert.match(findUnsafeIdea('   ', ctx) ?? '', /rỗng/)
})

test('metaTitle chiu them tran do dai cua the <title>', () => {
  const short = 'Best Water Filters at Frizzlife'
  assert.equal(findUnsafeMetaTitle(short, ctx), null)

  const long = 'Best Tankless Reverse Osmosis Water Filter Systems at Frizzlife 2026'
  assert.ok([...long].length > META_TITLE_MAX)
  assert.match(findUnsafeMetaTitle(long, ctx) ?? '', /vượt 50/)
})

test('metaTitle van phai qua het luat tu vung', () => {
  assert.match(findUnsafeMetaTitle('Best Waterdrop Filters', ctx) ?? '', /waterdrop/)
})

test('do dai metaTitle dem theo KY TU, khong theo byte', () => {
  // 50 ky tu, nhung dau gach ngang dai la 3 byte — dem byte thi bao vuot oan.
  const emDashes = 'Best Water Filters — Frizzlife — 2026 — Compare'
  assert.ok([...emDashes].length <= META_TITLE_MAX)
  assert.equal(findUnsafeMetaTitle(emDashes, ctx), null)
})
