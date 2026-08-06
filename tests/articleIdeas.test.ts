/**
 * Cong kiem tinh trung thuc cua luong sinh bai AI.
 *
 * Hai ca dat cuoc nang nhat, ca hai deu la loi that cua du an:
 *  - `PD600 Black` va `PD600 White` KHONG duoc dem thanh hai san pham. Dem thanh hai
 *    la sinh ra mot bai "4 lua chon tot nhat" ma thuc ra chi co 3 thu de chon.
 *  - `Best RO Filters 2026` (khong ten shop) phai bi TU CHOI kem ly do. Do la loi
 *    hua ve ca thi truong — dung loai hua hao ma su co `/about` vua phai sua.
 *
 * Danh muc Frizzlife trong file nay la danh muc that (do 2026-08-05).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  availableTemplates,
  dedupeVariants,
  groupCatalog,
  productKey,
  scanSpecs,
  keywordTokens,
  type IdeaProduct,
} from '@/lib/articleIdeas'

const CTX = { storeName: 'Frizzlife', year: 2026 }

const frizzlife: IdeaProduct[] = [
  {
    title: 'Frizzlife PD600-TAM3 600GPD Tankless Reverse Osmosis Water Filter System',
    url: 'https://www.frizzlife.com/products/pd600-tam3',
  },
  {
    title: 'Frizzlife PX600 600GPD Tankless Reverse Osmosis Water Filter System',
    url: 'https://www.frizzlife.com/products/px600',
  },
  {
    title: 'Frizzlife PD1000-N 1000GPD Reverse Osmosis Water Filter System',
    url: 'https://www.frizzlife.com/products/pd1000-n',
  },
  {
    title: 'Frizzlife PD800-N 800GPD Reverse Osmosis Water Filter System',
    url: 'https://www.frizzlife.com/products/pd800-n',
  },
  {
    title: 'Frizzlife WB99 Countertop Reverse Osmosis Water Filter System',
    url: 'https://www.frizzlife.com/products/wb99',
  },
  {
    title: 'Frizzlife FCR100+ Replacement RO Membrane Filter Cartridge',
    url: 'https://www.frizzlife.com/products/fcr100',
  },
]

// ── Thong so dang so ──────────────────────────────────────────────────

test('doc thong so dinh lien so lan cach mot khoang', () => {
  assert.deepEqual(scanSpecs('600GPD Tankless RO System').specs, { gpd: 600 })
  assert.deepEqual(scanSpecs('13 inch Laptop Stand').specs, { inch: 13 })
  assert.deepEqual(scanSpecs('5 Micron Sediment Filter').specs, { micron: 5 })
})

test('don vi mot chu cai chi tinh khi dinh lien so', () => {
  assert.deepEqual(scanSpecs('500W Power Station').specs, { w: 500 })
  // "2 g" trong mot ten san pham gan nhu luon la chu bi cat, khong phai 2 gram.
  assert.deepEqual(scanSpecs('Set of 2 Glass Jars').specs, {})
})

test('LOI THAT: slug an mat dau thap phan — "27 5 inch" la 27,5 chu khong phai 5', () => {
  // cycleaddons.com khong mo /products.json nen tieu de suy tu slug
  // `27-5-inch-full-suspension-mountain-bike`. Doc ra 5 thi cong tu tin bao
  // "INCH khac nhau (24 vs 5)" — mot con so sai dua thang cho nguoi van hanh.
  assert.deepEqual(scanSpecs('27 5 inch full suspension mountain bike').specs, { inch: 27.5 })
  // Nhung hai so nguyen canh nhau thi KHONG duoc ghep thanh so thap phan.
  assert.deepEqual(scanSpecs('24 26 inch mountain bike').specs, { inch: 26 })
})

test('ma model KHONG bi doc nham thanh thong so', () => {
  assert.deepEqual(scanSpecs('Frizzlife PD600-TAM3 Water Filter').specs, {})
  assert.deepEqual(scanSpecs('Frizzlife WB99 Countertop').specs, {})
  assert.deepEqual(scanSpecs('Model 2026 Edition').specs, {})
})

test('thong so bi go khoi tieu de truoc khi tim ma model', () => {
  assert.ok(!scanSpecs('PD1000-N 1000GPD RO System').stripped.toLowerCase().includes('1000gpd'))
  assert.ok(scanSpecs('PD1000-N 1000GPD RO System').stripped.includes('PD1000'))
})

// ── Gop bien the: ca dat cuoc nang nhat ───────────────────────────────

test('BIEN THE: PD600 Black va PD600 White la MOT san pham', () => {
  const { products, merged } = dedupeVariants([
    { title: 'Frizzlife PD600 RO System - Black', url: 'https://x.com/products/pd600-black' },
    { title: 'Frizzlife PD600 RO System - White', url: 'https://x.com/products/pd600-white' },
  ])
  assert.equal(products.length, 1, 'hai bien the mau phai gop lam mot')
  assert.equal(merged, 1)
})

test('cung ma model nhung khac LOAI HANG thi khong duoc gop', () => {
  const { products } = dedupeVariants([
    { title: 'Frizzlife PD600 RO Water Filter System', url: 'https://x.com/products/pd600' },
    { title: 'Frizzlife PD600 Replacement Filter Cartridge', url: 'https://x.com/products/pd600-cartridge' },
  ])
  assert.equal(products.length, 2, 'may loc va loi loc thay the la hai san pham khac nhau')
})

test('khac thong so thi khong duoc gop du ten con lai y het', () => {
  const { products } = dedupeVariants([
    { title: 'Frizzlife 600GPD Reverse Osmosis System', url: 'https://x.com/products/a' },
    { title: 'Frizzlife 800GPD Reverse Osmosis System', url: 'https://x.com/products/b' },
  ])
  assert.equal(products.length, 2)
})

test('gop bien the giu lai ban co du lieu day hon', () => {
  const { products } = dedupeVariants([
    { title: 'Cotton Tee - Blue', url: 'https://x.com/products/tee-blue' },
    { title: 'Cotton Tee - Red', url: 'https://x.com/products/tee-red', price: 19, description: 'x'.repeat(300) },
  ])
  assert.equal(products.length, 1)
  assert.equal(products[0].price, 19)
})

test('productKey bo qua mau nhung giu ma model', () => {
  assert.equal(productKey('PD600 System Black'), productKey('PD600 System White'))
  assert.notEqual(productKey('PD600 System'), productKey('PD800 System'))
})

// ── Gom nhom ──────────────────────────────────────────────────────────

test('tu khoa loai bo tu quang cao va so tran', () => {
  assert.deepEqual(
    keywordTokens('Best Premium 600GPD Reverse Osmosis Water Filter').sort(),
    ['filter', 'osmosis', 'reverse', 'water']
  )
})

test('nhom lon nhat la ca shop, nhom chat hon la loai hang', () => {
  const groups = groupCatalog(frizzlife)
  assert.equal(groups[0].products.length, 6, 'token thuong hieu gom ca shop')
  const ro = groups.find(g => g.keywords.includes('osmosis'))
  assert.ok(ro, 'phai co nhom "reverse osmosis"')
  assert.equal(ro!.products.length, 5, 'loi loc thay the khong nam trong nhom may loc')
  // Thu tu tu khoa doc duoc, khong phai xep theo tan suat.
  assert.deepEqual(ro!.keywords.slice(0, 5), ['frizzlife', 'reverse', 'osmosis', 'water', 'filter'])
})

// ── Cong kiem ─────────────────────────────────────────────────────────

test('Frizzlife: cong mo best-in-store, pham vi hoa vao dung ten shop', () => {
  const scan = availableTemplates(frizzlife, CTX)
  const best = scan.offered.filter(i => i.template === 'best-in-store')
  assert.ok(best.length >= 1)
  assert.match(best[0].workingTitle, /at Frizzlife \(2026\)$/)
  assert.match(best[0].workingTitle, /Reverse Osmosis/)
  // Nhom chi chung DUNG MOT tu ngoai ten shop thi khong duoc coi la mot loai hang.
  for (const idea of best) assert.notEqual(idea.products.length, 6)
})

test('Frizzlife: dong PD duoc nhan ra, du ba model nam ra rac', () => {
  const scan = availableTemplates(frizzlife, CTX)
  const line = scan.offered.find(i => i.template === 'line-compared')
  assert.ok(line, 'PD600/PD800/PD1000 phai mo duoc mau line-compared')
  assert.equal(line!.products.length, 3)
  // Tieu de liet ke ma model THAT, khong phai tien to "PD" do code suy ra.
  assert.match(line!.workingTitle, /PD1000 PD600 PD800/)
})

test('LOI THAT: ma VAT LIEU lap lai khong phai mot dong san pham', () => {
  // kyokuknives.com: 9 con dao cung thep VG10. Dem san pham thi thanh "dong VG",
  // dem MA KHAC NHAU thi lo ra chi co dung mot ma.
  const kyoku: IdeaProduct[] = [
    { title: 'Kyoku Chef Knife VG10 Steel Shogun Series', url: 'https://x.com/products/chef' },
    { title: 'Kyoku Utility Knife VG10 Steel Shogun Series', url: 'https://x.com/products/utility' },
    { title: 'Kyoku Boning Knife VG10 Steel Shogun Series', url: 'https://x.com/products/boning' },
  ]
  const scan = availableTemplates(kyoku, { storeName: 'Kyoku', year: 2026 })
  assert.ok(!scan.offered.some(i => i.template === 'line-compared'))
  assert.match(
    scan.rejected.find(r => r.template === 'line-compared')!.reason,
    /1 mã khác nhau/
  )
})

test('LOI THAT: dong model phai thay duoc ca khi ten san pham chi la ma SKU', () => {
  // O dan tay nhan URL Shopify -> tieu de suy tu slug la ma SKU tran, khong hai cai
  // nao chung mot tu nao. Tim dong model chi ben trong nhom token thi dong PD tang
  // hinh va tap 4 san pham hoan toan so duoc cho ra 0 y tuong.
  const pasted: IdeaProduct[] = [
    { title: 'pd600 tam3', url: 'https://www.frizzlife.com/products/pd600-tam3' },
    { title: 'px600', url: 'https://www.frizzlife.com/products/px600' },
    { title: 'pd1000 n', url: 'https://www.frizzlife.com/products/pd1000-n' },
    { title: 'pd800 n', url: 'https://www.frizzlife.com/products/pd800-n' },
  ]
  const scan = availableTemplates(pasted, CTX)
  const line = scan.offered.find(i => i.template === 'line-compared')
  assert.ok(line, 'PD600/PD800/PD1000 van phai nhan ra la mot dong')
  assert.equal(line!.products.length, 3)
  // Va ly do tu choi cua best-in-store khong duoc noi cau vo nghia "0 san pham".
  assert.match(
    scan.rejected.find(r => r.template === 'best-in-store')!.reason,
    /Không có hai sản phẩm nào chung một từ khoá/
  )
})

test('⚠️ Best RO Filters 2026 (khong ten shop) BI TU CHOI, kem ly do', () => {
  const scan = availableTemplates(frizzlife, CTX)
  assert.ok(!scan.offered.some(i => i.template === 'best-cross-brand'))
  const reject = scan.rejected.find(r => r.template === 'best-cross-brand')
  assert.ok(reject, 'tu choi phai NOI RA, khong duoc im lang')
  assert.match(reject!.reason, /Chỉ có 1 store/)
  // Ly do phai canh bao thang chuyen dem bang truong "Danh muc" cua store: no chi co
  // 10 gia tri rat rong, may loc nuoc va ghe sofa deu la "home". Dem theo do la mo
  // mot cong dang le phai dong.
  assert.match(reject!.needed, /Danh mục/)
})

test('cross-brand mo khi Sanity that su co store thu hai cung nhom', () => {
  const scan = availableTemplates(frizzlife, { ...CTX, categoryStoreCount: 2 })
  const cross = scan.offered.find(i => i.template === 'best-cross-brand')
  assert.ok(cross)
  assert.doesNotMatch(cross!.workingTitle, /Frizzlife/, 'bai xuyen thuong hieu khong gan ten mot shop')
})

test('versus can mot TRUC so sanh that, khong chi la cung dong', () => {
  const scan = availableTemplates(frizzlife, CTX)
  const versus = scan.offered.filter(i => i.template === 'versus')
  assert.ok(versus.length >= 1)
  // Hai may cung 600 GPD, khong co gia -> khong co gi de so -> khong duoc de xuat.
  const sameGpd = versus.find(
    i => i.products.some(p => p.url.endsWith('px600')) && i.products.some(p => p.url.endsWith('pd600-tam3'))
  )
  assert.equal(sameGpd, undefined, 'PX600 vs PD600-TAM3 cung 600 GPD thi khong phai mot bai so ke')
  for (const idea of versus) assert.match(idea.why, /GPD khác nhau|giá lệch/)
})

test('versus mo bang gia khi lech tu 10% tro len', () => {
  const pair: IdeaProduct[] = [
    { title: 'Kyoku Shogun Chef Knife 8 Inch', url: 'https://x.com/products/shogun-chef', price: 120 },
    { title: 'Kyoku Samurai Chef Knife 8 Inch', url: 'https://x.com/products/samurai-chef', price: 80 },
  ]
  const scan = availableTemplates(pair, { storeName: 'Kyoku', year: 2026 })
  const versus = scan.offered.find(i => i.template === 'versus')
  assert.ok(versus)
  assert.match(versus!.why, /giá lệch 33%/)
})

test('lech gia duoi 10% khong phai truc so sanh', () => {
  const pair: IdeaProduct[] = [
    { title: 'Kyoku Shogun Chef Knife 8 Inch', url: 'https://x.com/products/shogun-chef', price: 100 },
    { title: 'Kyoku Samurai Chef Knife 8 Inch', url: 'https://x.com/products/samurai-chef', price: 95 },
  ]
  const scan = availableTemplates(pair, { storeName: 'Kyoku', year: 2026 })
  assert.ok(!scan.offered.some(i => i.template === 'versus'))
  assert.match(
    scan.rejected.find(r => r.template === 'versus')!.reason,
    /không cặp nào so được/
  )
})

test('review dong khi chua cao trang, va ly do noi dung chuyen do', () => {
  const scan = availableTemplates(frizzlife, CTX)
  assert.ok(!scan.offered.some(i => i.template === 'review'))
  const reject = scan.rejected.find(r => r.template === 'review')!
  assert.match(reject.reason, /Chưa cào trang sản phẩm nào/)
})

test('review dong khi da cao ma mo ta qua ngan — ly do phai KHAC', () => {
  const scan = availableTemplates(
    [{ ...frizzlife[0], description: 'Tankless RO system.' }],
    CTX
  )
  const reject = scan.rejected.find(r => r.template === 'review')!
  assert.match(reject.reason, /mô tả dài nhất chỉ 19 ký tự/)
})

test('review mo khi shop that su co mo ta dai', () => {
  const scan = availableTemplates([{ ...frizzlife[0], description: 'x'.repeat(240) }], CTX)
  const review = scan.offered.find(i => i.template === 'review')
  assert.ok(review)
  assert.match(review!.workingTitle, /Review \(2026\)$/)
  assert.doesNotMatch(review!.workingTitle, /Frizzlife/, 'ten shop da nam o cho khac, khong lap lai trong tieu de')
})

test('shop khong co nhom nao du 3 san pham thi khong ep ra y tuong', () => {
  const scan = availableTemplates(
    [
      { title: 'Paws at Peace Memorial Urn', url: 'https://x.com/products/urn' },
      { title: 'Paws at Peace Paw Print Kit', url: 'https://x.com/products/paw-kit' },
    ],
    { storeName: 'Paws at Peace', year: 2026 }
  )
  assert.equal(scan.offered.length, 0)
  // Moi mau deu phai giai thich vi sao dong — man hinh trong khong noi len dieu gi.
  assert.equal(scan.rejected.length, 6)
})

test('so san pham cong kiem dung la so SAU khi gop bien the', () => {
  const scan = availableTemplates(
    [
      ...frizzlife,
      { title: 'Frizzlife PD800-N 800GPD Reverse Osmosis Water Filter System - White', url: 'https://x.com/products/pd800-n-white' },
    ],
    CTX
  )
  assert.equal(scan.productCount, 6)
  assert.equal(scan.variantsMerged, 1)
})

test('khoa y tuong on dinh giua hai lan quet du thu tu danh muc doi', () => {
  const a = availableTemplates(frizzlife, CTX)
  const b = availableTemplates([...frizzlife].reverse(), CTX)
  assert.deepEqual(
    a.offered.map(i => i.key).sort(),
    b.offered.map(i => i.key).sort()
  )
})

test('moi tu trong tieu de tam deu truy nguoc duoc ve danh muc, ten shop hoac nam', () => {
  const scan = availableTemplates(frizzlife.map(p => ({ ...p, description: 'x'.repeat(240) })), {
    ...CTX,
    categoryStoreCount: 2,
  })
  const allowed = new Set([
    ...frizzlife.flatMap(p => [...keywordTokens(p.title), ...p.title.toLowerCase().split(/[^a-z0-9]+/)]),
    'frizzlife', '2026', 'best', 'at', 'vs', 'for', 'with', 'series', 'compared', 'review',
  ])
  for (const idea of scan.offered) {
    for (const word of idea.workingTitle.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
      assert.ok(allowed.has(word), `"${word}" trong "${idea.workingTitle}" khong den tu du lieu that`)
    }
  }
})

// ── Hai bai khong duoc dung chung mot bo san pham ─────────────────────
//
// ⚠️ Do that tren 48 bai da dang: ba cap bai dung BO SAN PHAM Y HET NHAU (HWWH 9/9,
// Tova 8/8, Hunny Life 5/5), va ca ba deu la mot bai `best-in-store` di cung mot bai
// `best-for` sinh ra tu chinh nhom do. Dat ten khac nhau cho hai trang cung noi dung
// chi la giau chuyen do di — chung van canh tranh nhau tren cung mot truy van.

/** Nhom 8 xe cung loai; 3 chiec mang them chu "dual" — dac diem thieu so. */
const scooters: IdeaProduct[] = [
  'dual drive smart adult electric scooter p5',
  'dual drive smart adult electric scooter p10',
  'dual drive smart adult electric scooter x9',
  'smart adult electric scooter x14',
  'smart adult electric scooter x7',
  'smart adult electric scooter x5',
  'smart adult electric scooter s3',
  'smart adult electric scooter p3',
].map((title, i) => ({ title: `HWWH ${title}`, url: `https://hwwh.com/products/s${i}` }))

test('best-for viet tren TAP CON mang dac diem, khong phai ca nhom', () => {
  const scan = availableTemplates(scooters, { storeName: 'HWWH', year: 2026 })
  const bestFor = scan.offered.find(i => i.template === 'best-for')
  const bestInStore = scan.offered.find(i => i.template === 'best-in-store')
  if (!bestFor) return // shop nay khong mo mau do thi khong co gi de kiem
  assert.ok(bestInStore, 'nhom nay phai mo duoc best-in-store')
  assert.ok(
    bestFor.products.length < bestInStore.products.length,
    `best-for phai hep hon best-in-store, dang la ${bestFor.products.length} vs ${bestInStore.products.length}`
  )
})

test('⚠️ khong bao gio co hai y tuong tren bo san pham y het nhau', () => {
  for (const products of [scooters, frizzlife]) {
    const scan = availableTemplates(products, { storeName: 'HWWH', year: 2026 })
    const seen = new Map<string, string>()
    for (const idea of scan.offered) {
      const key = idea.products.map(p => p.url).sort().join('\n')
      const prev = seen.get(key)
      assert.equal(prev, undefined, `"${idea.workingTitle}" trùng bộ sản phẩm với "${prev}"`)
      seen.set(key, idea.workingTitle)
    }
  }
})

test('cung mot mau thi bai nam gon trong bai khac bi loai', () => {
  // Hai nhom cung ra `best-in-store`, mot nhom nam gon trong nhom kia — do that tren
  // PRO TOUR (4 san pham va 3 san pham).
  const scan = availableTemplates(scooters, { storeName: 'HWWH', year: 2026 })
  const roundups = scan.offered.filter(i => i.template === 'best-in-store')
  for (let i = 0; i < roundups.length; i++) {
    for (let j = 0; j < roundups.length; j++) {
      if (i === j) continue
      const a = new Set(roundups[i].products.map(p => p.url))
      const b = new Set(roundups[j].products.map(p => p.url))
      assert.ok(![...a].every(u => b.has(u)), `"${roundups[i].workingTitle}" nằm gọn trong "${roundups[j].workingTitle}"`)
    }
  }
})
