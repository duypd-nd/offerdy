/**
 * Khop tieu de offer voi san pham trong danh muc shop.
 *
 * Ca quan trong nhat o duoi cung: offer "PD1200 RO Water Filter" tung duoc goi y
 * — va duoc duyet vao production — mot LOI LOC THAY THE (FCR100+), chi vi trung ba
 * tu chung "ro/water/filter". Danh muc Frizzlife trong file nay la danh muc that.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { suggestProducts, modelCodes, meaningfulTokens, type CatalogProduct } from '@/lib/productMatch'

const frizzlife = [
  { title: 'Frizzlife FCR100+ Replacement RO Membrane Filter Cartridge For WB99 Countertop Reverse Osmosis Water Filter System', url: 'https://www.frizzlife.com/products/fcr100' },
  { title: 'Frizzlife 1000GPD Reverse Osmosis Water Filter ... PD1000-N', url: 'https://www.frizzlife.com/products/pd1000-n' },
  { title: 'Frizzlife 800GPD Reverse Osmosis Water Filter ... PD800-N', url: 'https://www.frizzlife.com/products/pd800-n' },
]

test('nhan dien ma model (vua chu vua so)', () => {
  assert.deepEqual(modelCodes(['pd1200', 'water', 'm800', 'filter', 't2596m']), ['pd1200', 'm800', 't2596m'])
  assert.deepEqual(modelCodes(['water', 'filter', 'skincare']), [])
  assert.deepEqual(modelCodes(['1000', '2026']), [])
})

test('uu dai toan shop -> khong du tu de goi y', () => {
  for (const title of [
    'Free Shipping on All Orders',
    '10% Off On Your Order at Venatos with this exclusive offer',
  ]) {
    assert.ok(meaningfulTokens(title).length < 2, title)
  }
})

test('tu khuyen mai bi loai khoi tu khoa khop', () => {
  const t = meaningfulTokens('Hydrating Creamy Face Wash – 17% Off')
  assert.deepEqual(t.sort(), ['creamy', 'face', 'hydrating', 'wash'])
})

test('LOI THAT: "PD1200 RO Water Filter" khong con goi y fcr100', () => {
  const s = suggestProducts('PD1200 RO Water Filter – Save $219', frizzlife)
  assert.equal(s.length, 0, 'shop khong co PD1200 nen dung ra khong goi y gi: ' + JSON.stringify(s.map(x => x.url)))
})

test('shop CO dung ma model -> van goi y', () => {
  const s = suggestProducts('PD800-N RO Water Filter – Save $100', frizzlife)
  assert.ok(s.length >= 1)
  assert.match(s[0].url, /pd800-n/)
})

test('offer nhieu ma model -> phai khop DU', () => {
  const s = suggestProducts('Bundle PD800-N and M800 Filters', [
    { title: 'Frizzlife PD800-N only', url: 'https://x.com/products/pd800-n' },
  ])
  assert.equal(s.length, 0)
})

test('offer khong co ma model -> giu hanh vi khop theo tu thuong', () => {
  assert.ok(suggestProducts('Reverse Osmosis Water Filter Deal', frizzlife).length >= 1)
})

test('cac ca da chay dung phai giu nguyen 100%', () => {
  const bike = suggestProducts('27.5 Inch Full Suspension Mountain Bike – 74% Off', [
    { title: '27 5 inch full suspension mountain bike', url: 'https://cycleaddons.com/product/27-5-inch-full-suspension-mountain-bike/' },
    { title: '12 inch childrens mountain bike', url: 'https://cycleaddons.com/product/12-inch-childrens-mountain-bike/' },
  ])
  assert.match(bike[0].url, /27-5-inch-full-suspension/)

  const wash = suggestProducts('Hydrating Creamy Face Wash – 17% Off', [
    { title: 'hydrating creamy face wash', url: 'https://consistentderma.com/product/hydrating-creamy-face-wash/' },
  ])
  assert.equal(wash[0].score, 1)
})

// ── Ten shop la NHIEU, khong phai thong tin ───────────────────────────
//
// ⚠️ Do that tren VisoOne Eyewear, thay bang mat tren /admin/deep-links: uu dai
// *"20% Off On Your Order at VisoOne Eyewear with this exclusive offer"* — ap cho CA
// SHOP — con lai dung hai token `visoone` + `eyewear`, du de KHONG bi coi la store-wide,
// va bo goi y dua ra **bon cap kinh o muc 50%**. Mot cu bam met tay la khach cam ma giam
// 20% toan shop bi dan toi mot cap kinh ngau nhien.

const visoone: CatalogProduct[] = [
  { url: 'https://www.visoone.com/products/mona', title: 'Mona' },
  { url: 'https://www.visoone.com/products/rio', title: 'Rio' },
  { url: 'https://www.visoone.com/products/calina', title: 'Calina' },
]

test('⚠️ ten shop bi loai khoi tu khoa co nghia', () => {
  const title = '20% Off On Your Order at VisoOne Eyewear with this exclusive offer'
  // Khong biet ten shop -> con `visoone` + `eyewear`, du 2 tu de bi coi la co the goi y.
  assert.equal(meaningfulTokens(title).length >= 2, true)
  // Biet ten shop -> khong con gi ca, va do moi la su that: uu dai nay ap cho ca shop.
  assert.deepEqual(meaningfulTokens(title, 'VisoOne Eyewear'), [])
})

test('⚠️ uu dai ca shop KHONG duoc goi y san pham nao', () => {
  const title = '20% Off On Your Order at VisoOne Eyewear with this exclusive offer'
  assert.equal(suggestProducts(title, visoone).length > 0, true, 'chưa biết tên shop thì vẫn gợi ý bừa')
  assert.deepEqual(suggestProducts(title, visoone, { storeName: 'VisoOne Eyewear' }), [])
})

test('offer co ten san pham that van goi y duoc du da loai ten shop', () => {
  const out = suggestProducts('VisoOne Mona Sunglasses 20% Off', visoone, { storeName: 'VisoOne Eyewear' })
  assert.equal(out[0]?.title, 'Mona')
})
