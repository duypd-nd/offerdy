/**
 * Ten ngan cua san pham, dung giua van xuoi cua bai viet.
 *
 * ⚠️ **Ba tap du lieu trong file nay la DANH MUC THAT, chep tu `articleProducts` cua ba
 * bai dang chay tren site** (PoshRug 12 san pham, HWWH 9, Kyokuknives 9). Do la chu y,
 * khong phai tien. Va cham ten chi ton tai o muc TAP HOP: mot fixture ba dong tu dung
 * *chinh la* thu da lam du an tra gia ba lan (`articleIdeas.ts:126-132`, `:213-229`).
 * Ban dau tien cua thuat toan nay cho qua het fixture tu dung, roi no ra
 * "Brown Rug" cho cai tham NAU-DEN va "Electric" cho mot chiec xe dien — ca hai chi lo
 * ra khi chay tren ba danh muc nay.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shortProductNames } from '@/lib/productShortName'

/** PoshRug — 12 san pham. Ba dong o giua co PHAN DINH DANH y het nhau. */
const poshrug = [
  'Taupe Cowhide Print Area Rug – Soft, Modern Accent',
  'Gray Cowhide Print Area Rug – Modern Luxe Accent',
  'Brown Cowhide Area Rug – Modern Textured Accent',
  'Cowhide Area Rug – Brown & Black Modern Accent',
  'Cowhide Area Rug – Handmade Black & White Accent',
  'Cowhide Area Rug – Black & White Modern Accent Rug',
  'Off White Cowhide Print Rug – Soft, Modern Accent',
  'Natural Cowhide Rug – Handmade Luxury Area Accent',
  'Cowhide Print Hand Knotted Rug – Brown & White Accent',
  'Cowhide Animal Print Rug – Brown & White Accent',
  'Tan Cowhide Print Area Rug – Soft, Handcrafted Accent',
  'Black Cowhide Print Handwoven Rug – Modern Accent',
]

/** HWWH — 9 xe, ma model o ngay sau ten shop. */
const hwwh = [
  'HWWH X14 Best Foldable Smart Adult Electric Scooter | Off-Road Two Wheel Electric Scooter',
  'HWWH P5 Dual Drive Smart Adult Foldable Electric Scooter | Two Wheel Off-Road Electric Scooter',
  'HWWH P10 Best Dual Drive Adult Electric Scooter | Off-Road Two Wheel Electric Scooter',
  'HWWH X9 Dual Drive Smart Adult Two Wheel Electric Scooter | 20 km/h Off-Road Electric Scooter',
  'HWWH P8 Best Adult Off-Road Two Wheel Electric Scooter',
  'HWWH S3 professional Adults Off Road Two Wheel Electric Scooter',
  'HWWH P3 Folding Adult Two Wheel Off-road Electric e Scooter',
  'HWWH X7 Foldable Adults Two Wheel Off-Road Electric Scooter',
  'HWWH X5A Folding Dual Motor Off-Road Two Wheel Electric Scooter',
]

/** Kyokuknives — 9 dao, khong dao nao co ma rieng: tat ca cung `VG10`. */
const kyoku = [
  '4.5" Non-Serrated Steak Knife Set VG10 Steel Silver-ion Coating 4-Piece | Gin Series',
  '5" Japanese Utility Knife VG10 Damascus Steel with Silver Ion Blade | Gin Series',
  '10" Brisket Butcher Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
  '10″ Bullnose Butcher Knife VG10 Steel with Silver-ion Coating  | Gin Series',
  '8" Bread Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
  '8.5" Kiritsuke Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
  '3.5" Paring Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
  '7" Nakiri Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
  '7" Cleaver Knife VG10 Damascus Steel Silver-ion Coating | Gin Series',
]

function assertUnique(names: string[], label: string) {
  const seen = new Map<string, number>()
  names.forEach((n, i) => {
    const k = n.toLowerCase()
    const prev = seen.get(k)
    assert.equal(prev, undefined, `${label}: "${n}" (#${i}) trùng với #${prev}`)
    seen.set(k, i)
  })
}

test('⚠️ PoshRug 12 sản phẩm thật: mọi tên đều duy nhất', () => {
  const names = shortProductNames(poshrug, { storeName: 'PoshRug' })
  assert.equal(names.length, 12)
  assertUnique(names, 'PoshRug')
  // Cat ngay tho o dau gach ngang cho BA cai ten y het nhau — day la cai bay.
  assert.ok(!names.includes('Cowhide Area Rug'), 'không được dừng ở phần định danh chung')
})

test('mọi từ của tên ngắn phải có trong chính tiêu đề của nó', () => {
  // Luat nen cua ca luong: khong tu nao duoc bia ra. Ap cho ca ba danh muc.
  for (const [store, titles] of [['PoshRug', poshrug], ['HWWH', hwwh], ['Kyoku', kyoku]] as const) {
    const names = shortProductNames(titles, { storeName: store })
    names.forEach((name, i) => {
      const source = titles[i].toLowerCase().replace(/[^a-z0-9]+/g, ' ')
      for (const w of name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean)) {
        assert.ok(source.includes(w), `${store}: từ "${w}" trong "${name}" không có trong "${titles[i]}"`)
      }
    })
  }
})

test('⚠️ không cắt đôi một cặp nối bằng "&"', () => {
  // "Brown" mot minh goi cai tham NAU-DEN la "cai tham nau", trong khi trong lo con mot
  // cai tham nau that (#3). Ban dau cua ham ra dung "Brown Rug" vi `norm('&')` tra ve
  // chuoi rong nen phep kiem cap khong bao gio dung.
  const names = shortProductNames(poshrug, { storeName: 'PoshRug' })
  assert.equal(names[3], 'Brown & Black Rug')
  assert.equal(names[5], 'Black & White Rug')
})

test('HWWH: mã model được chọn, tên shop thì không', () => {
  const names = shortProductNames(hwwh, { storeName: 'HWWH' })
  assert.deepEqual(names, ['X14', 'P5', 'P10', 'X9', 'P8', 'S3', 'P3', 'X7', 'X5A'])
  assert.ok(!names.some(n => /hwwh/i.test(n)), 'tên shop không bao giờ là tên sản phẩm')
})

test('⚠️ mã chữ-số-chữ không bị scanSpecs ăn mất', () => {
  // `X5A` bi doc la "5 A" (ampere — `a` nam trong ATTACHED_ONLY) va bi cat khoi
  // `stripped`, nen chiec xe duy nhat khong co ma roi xuong nac sau va nhan cai ten vo
  // nghia "Electric". Chi lo ra tren danh muc that.
  const names = shortProductNames(hwwh, { storeName: 'HWWH' })
  assert.equal(names[8], 'X5A')
})

test('Kyokuknives: không mã riêng thì lấy loại dao đứng trước danh từ gốc', () => {
  const names = shortProductNames(kyoku, { storeName: 'Kyokuknives' })
  assertUnique(names, 'Kyoku')
  assert.deepEqual(names, [
    'Steak Knife', 'Utility Knife', 'Brisket Butcher Knife', 'Bullnose Butcher Knife',
    'Bread Knife', 'Kiritsuke Knife', 'Paring Knife', 'Nakiri Knife', 'Cleaver Knife',
  ])
  // `VG10` co mat 9/9 nen no KHONG phan biet duoc gi — danh tu goc phai la `Knife`.
  assert.ok(!names.some(n => /vg10/i.test(n)))
})

test('mã model giữ nguyên hình dạng gốc, không bị cắt đôi', () => {
  // `tokenize` cat `PD600-TAM3` thanh `pd600` + `tam3`; dung token se ra `PD600` va
  // danh mat `-TAM3` — dung loi `PD600-TAM` da tra gia o Chang 4.
  const names = shortProductNames([
    'Frizzlife PD600-TAM3 600GPD Tankless Reverse Osmosis Water Filter System',
    'Frizzlife PX600 600GPD Tankless Reverse Osmosis Water Filter System',
  ], { storeName: 'Frizzlife' })
  assert.deepEqual(names, ['PD600-TAM3', 'PX600'])
  assert.ok(!names.includes('PD600'), 'không được cắt cụt mã model')
})

test('⚠️ phụ tùng KHÔNG được đặt tên theo sản phẩm nó lắp vào', () => {
  // Khong cat duoi "for ..." thi loi loc ASR611 se mang ten `PD1200` — tuc dat ten mot
  // san pham theo mot san pham KHAC.
  const names = shortProductNames([
    'ASR611 Replacement Filter Cartridge for PD1200 Reverse Osmosis System',
    'Frizzlife PD600-TAM3 600GPD Tankless Reverse Osmosis Water Filter System',
  ], { storeName: 'Frizzlife' })
  assert.equal(names[0], 'ASR611')
  assert.ok(!names[0].includes('PD1200'))
})

test('hai tiêu đề chỉ khác đuôi tương thích -> cả hai lùi về tiêu đề đầy đủ', () => {
  const titles = [
    'Replacement Filter Cartridge for PD1200 System',
    'Replacement Filter Cartridge for PD1000 System',
  ]
  assert.deepEqual(shortProductNames(titles), titles)
})

test('hai tiêu đề trùng khít -> cả hai đầy đủ, không hậu tố số', () => {
  // ⚠️ Tuyet doi khong gan `(2)`: mot token do code bia ra nam giua van xuoi khong phan
  // biet duoc voi mot ma model that.
  const titles = ['Cowhide Area Rug – Modern Accent', 'Cowhide Area Rug – Modern Accent']
  const names = shortProductNames(titles)
  assert.deepEqual(names, titles)
  assert.ok(!names.some(n => /\(\d\)/.test(n)))
})

test('tên "ngắn" mà không ngắn hơn thì trả về tiêu đề đầy đủ', () => {
  const titles = ['Blue Mat', 'Red Mat']
  // "Blue Mat" khong the ngan hon chinh no.
  assert.deepEqual(shortProductNames(titles), titles)
})

test('một sản phẩm, và danh sách rỗng', () => {
  assert.deepEqual(shortProductNames([]), [])
  const one = ['Natural Cowhide Rug – Handmade Luxury Area Accent']
  assert.equal(shortProductNames(one).length, 1)
})

test('không tên nào kết thúc bằng từ treo', () => {
  for (const [store, titles] of [['PoshRug', poshrug], ['HWWH', hwwh], ['Kyoku', kyoku]] as const) {
    for (const n of shortProductNames(titles, { storeName: store })) {
      assert.ok(!/\s(&|and|with|for|the|a|an|of|-|,)$/i.test(n), `${store}: "${n}" bị bỏ lửng`)
    }
  }
})

test('tiêu đề suy từ slug (viết thường, mất dấu thập phân) không làm hàm vỡ', () => {
  // 17/28 shop khong mo /products.json nen tieu de suy tu slug.
  const titles = [
    '27 5 inch full suspension mountain bike',
    '24 inch youth mountain bike',
    '26 inch all terrain mountain bike',
  ]
  const names = shortProductNames(titles)
  assert.equal(names.length, 3)
  assertUnique(names, 'slug')
  // Khong duoc tu sua chu hoa — do la viec cua nguoi, khong phai cua ham nay.
  for (const n of names) assert.equal(n, n.toLowerCase())
})
