/**
 * Thay the vuong luc goi trang.
 *
 * Ca dat cuoc nang nhat: **ma giam het han sau khi bai da dang**. Prompt khong the lo
 * duoc chuyen do — luc viet bai ma con song. Chi render moi lo duoc, va cach lo dung
 * la go CA CAU chu khong chi go token: *"dung ma  khi thanh toan"* te hon im lang.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  renderPostTokens, renderCouponToken, renderPriceTokens, remainingTokens,
  formatPrice, priceNote, cappedImageUrl, type RenderProduct,
} from '@/lib/postRender'

const products: RenderProduct[] = [
  {
    url: 'https://www.frizzlife.com/products/pd400',
    title: 'Frizzlife PD400',
    imageUrl: 'https://cdn.shopify.com/pd400.png',
    priceAtWriting: '298.75',
    currency: 'USD',
    capturedAt: '2026-08-05T03:38:41.015Z',
  },
  {
    url: 'https://www.frizzlife.com/products/pd600-tam3',
    title: 'Frizzlife PD600-TAM3',
    priceAtWriting: '469.99',
    currency: 'USD',
    capturedAt: '2026-08-05T03:38:41.015Z',
  },
]

test('gia: ghep ky hieu tien te, khong ghep hai lan', () => {
  assert.equal(formatPrice('298.75', 'USD'), '$298.75')
  assert.equal(formatPrice('$298.75', 'USD'), '$298.75')
  assert.equal(formatPrice('298.75'), '298.75')
  // Khong biet ky hieu -> ghi MA tien te, KHONG mac dinh thanh $.
  assert.equal(formatPrice('50000', 'IDR'), '50000 IDR')
  assert.equal(formatPrice(undefined, 'USD'), null)
})

test('⚠️ ma giam het han -> go CA CAU, khong chi go token', () => {
  const html = '<p>Intro.</p><p>Use code [COUPON] at checkout.</p><p>Outro.</p>'
  const gone = renderCouponToken(html, null)
  assert.ok(!gone.includes('[COUPON]'))
  assert.ok(!gone.includes('at checkout'), 'câu nhắc mã phải biến mất cùng token: ' + gone)
  assert.ok(gone.includes('Intro.') && gone.includes('Outro.'), 'chỉ gỡ đúng câu đó')
})

test('con ma thi hien ma that', () => {
  const out = renderCouponToken('<p>Use [COUPON] now.</p>', { code: 'OFFERDY' })
  assert.match(out, /OFFERDY/)
  assert.ok(!out.includes('[COUPON]'))
})

test('token nam ngoai the khoi van bi go sach', () => {
  assert.ok(!renderCouponToken('Use [COUPON] now', null).includes('[COUPON]'))
})

test('go the boc dang <li> chu khong nuot ca danh sach', () => {
  const html = '<ul><li>Free shipping</li><li>Code [COUPON]</li><li>Fast support</li></ul>'
  const out = renderCouponToken(html, null)
  assert.ok(out.includes('Free shipping') && out.includes('Fast support'))
  assert.ok(!out.includes('[COUPON]') && !out.includes('Code'))
})

test('[PRICE:n] lay gia luc viet, [WAS:n] khong co nguon thi bien mat', () => {
  const out = renderPriceTokens('<p>Now [PRICE:1], was [WAS:1].</p>', products)
  assert.match(out, /\$298\.75/)
  assert.ok(!out.includes('[WAS:1]'))
})

test('san pham khong co gia -> token bien mat, khong de lai chuoi rac', () => {
  const noPrice = [{ url: 'https://x.com/a', title: 'A' }]
  const out = renderPriceTokens('<p>Costs [PRICE:1].</p>', noPrice)
  assert.ok(!out.includes('[PRICE:1]'))
  assert.equal(out, '<p>Costs .</p>')
})

test('[CTA:n] ra link co nofollow sponsored — va KHONG tu gan ma ref', () => {
  const out = renderPostTokens('<p>[CTA:1]</p>', { products, storeName: 'Frizzlife' })
  assert.match(out, /rel="nofollow sponsored noopener"/)
  assert.match(out, /href="https:\/\/www\.frizzlife\.com\/products\/pd400"/)
  // Ref do `getStoreRefForHtml` gan sau, o mot cho duy nhat. Gan hai noi la co hai
  // cho de lech.
  // ⚠️ Kiem `?ref=`/`&ref=` chu khong phai chuoi con `ref=`: `href=` cung chua no.
  assert.ok(!/[?&]ref=/.test(out))
})

test('[IMAGE:n] cho san pham khong co anh -> bien mat chu khong ra the <img> hong', () => {
  const out = renderPostTokens('<p>[IMAGE:2]</p>', { products })
  assert.ok(!out.includes('<img'))
  assert.ok(!out.includes('[IMAGE:2]'))
})

test('cat anh o CDN — nhung CHI khi biet chac CDN hieu tham so do', () => {
  // Do that: anh goc 1614x1614 do vao o rong 300px, va the <img> nay khong di qua
  // next/image nen khong ai cat ho.
  assert.match(cappedImageUrl('https://cdn.shopify.com/s/files/1/x/PD400.png?v=17579'), /width=700/)
  // Host khac thi de nguyen: nhet tham so la vao URL anh la cach lam vo anh.
  assert.equal(cappedImageUrl('https://example.com/a.png'), 'https://example.com/a.png')
  // Da co `width` san thi khong ghi de.
  assert.equal(
    cappedImageUrl('https://cdn.shopify.com/a.png?width=200'),
    'https://cdn.shopify.com/a.png?width=200'
  )
  // URL rac thi tra ve nguyen ven, khong nem loi.
  assert.equal(cappedImageUrl('khong-phai-url'), 'khong-phai-url')
})

test('⚠️ anh LUON di kem ten mon hang cua chinh no', () => {
  // Ban truoc anh noi giua dong chu: anh cua san pham nay trot nam canh doan noi ve
  // san pham khac va nguoi doc khong biet minh dang nhin mon nao.
  const withImages = [products[0], { ...products[1], imageUrl: 'https://cdn.shopify.com/pd600.png' }]
  const out = renderPostTokens('<p>[IMAGE:1]</p><p>[IMAGE:2]</p>', {
    products: withImages, storeName: 'Frizzlife',
  })
  assert.ok(!out.includes('float') && !out.includes('article-figure'), 'khong con khoi noi')
  for (const p of withImages) {
    const card = out.split('<div class="article-card">').find(c => c.includes(p.imageUrl!))
    assert.ok(card, `khong tim thay thẻ của ${p.title}`)
    assert.ok(card.includes(p.title), `ảnh ${p.imageUrl} không kèm tên "${p.title}"`)
    assert.ok(card.includes(p.url), `thẻ ${p.title} không có đường mua`)
  }
  // Gia chup luc viet hien ngay canh ten, khong bat nguoi doc doi chieu.
  assert.match(out, /article-card-price">\$298\.75/)
  // Nhan nut ngan: ten mon hang da nam ngay tren no roi.
  assert.match(out, />Check price at Frizzlife</)
})

test('⚠️ [CTA:n] dung mot minh -> the san pham, KHONG phai mot thanh xanh tran', () => {
  // Do that tren bai Babywonders: chin [CTA:n] lien tiep ra chin thanh xanh chong len
  // nhau, khong nut nao noi ro no dan di dau.
  const withImages = [products[0], { ...products[1], imageUrl: 'https://cdn.shopify.com/pd600.png' }]
  const out = renderPostTokens('<p>[CTA:1]</p><p>[CTA:2]</p>', { products: withImages, storeName: 'Frizzlife' })
  assert.equal(out.split('article-card"').length - 1, 2)
  assert.match(out, /Frizzlife PD600-TAM3/)
})

test('⚠️ [CTA:n] DINH CUOI doan van la duong mua dung rieng, khong phai the giua cau', () => {
  // Do that: `… purely visual. [CTA:1] [CTA:2]` ra hai link chu cach nhau mot dau cach
  // — doc thanh MOT chuoi ten dai vo nghia, khong ai biet do la hai duong mua khac nhau.
  const out = renderPostTokens('<p>The choice is visual. [CTA:1] [CTA:2]</p>', {
    products, storeName: 'Frizzlife',
  })
  assert.ok(!out.includes('article-buylink'), 'dính cuối đoạn thì không ra link chữ')
  assert.equal(out.split('article-card"').length - 1, 2, 'mỗi sản phẩm một thẻ riêng')
  // Cau van con nguyen, va nam TRUOC cac the.
  assert.ok(out.indexOf('The choice is visual.') < out.indexOf('article-card'))
  assert.ok(!out.includes('visual. </p>'), 'không để lại khoảng trắng thừa cuối câu')
})

test('⚠️ san pham DA co the thi [CTA:n] rieng khong do them nut thu hai', () => {
  const out = renderPostTokens('<p>[IMAGE:1]</p><p>[CTA:1]</p>', { products, storeName: 'Frizzlife' })
  assert.equal(out.split('article-card"').length - 1, 1, 'chỉ một thẻ cho một sản phẩm')
  assert.equal(out.split('article-cta').length - 1, 1, 'chỉ một nút mua')
})

test('san pham khong co anh van duoc mot the day du de mua', () => {
  // Khong cao duoc anh la van de du lieu, khong phai ly do de mon hang mat duong mua.
  const out = renderPostTokens('<p>[CTA:2]</p>', { products, storeName: 'Frizzlife' })
  assert.ok(!out.includes('<img'), 'không dựng thẻ <img> rỗng')
  assert.match(out, /article-card-name">Frizzlife PD600-TAM3/)
  assert.match(out, /article-card-price">\$469\.99/)
})

test('⚠️ [CTA:n] GIUA CAU ra link chu — nut khoi se be doi cau van', () => {
  const out = renderPostTokens(
    '<p>If you also need a bigger unit, [CTA:2] gets you there.</p>',
    { products, storeName: 'Frizzlife' }
  )
  assert.ok(!out.includes('article-card'), 'giữa câu thì không dựng thẻ')
  assert.match(out, /class="article-buylink"[^>]*>Frizzlife PD600-TAM3<\/a>/)
  // Van la duong mua that: co nofollow sponsored y nhu nut.
  assert.match(out, /rel="nofollow sponsored noopener"/)
  // Cau van con nguyen ca hai dau.
  assert.match(out, /If you also need a bigger unit, .*gets you there\./)
})

test('⚠️ du the nam o dau, KHONG san pham nao mat duong mua', () => {
  // Bo cuc doi thi de mat mot link — va mat link la mat hoa hong, kieu that thu am
  // tham nhat vi khong ai phat hien. Ba the nay dai dien ba duong di khac nhau trong
  // `renderPostTokens`: the (anh), the (dinh cuoi doan), link chu (giua cau).
  const withImages = [products[0], { ...products[1], imageUrl: 'https://cdn.shopify.com/pd600.png' }]
  const html = '<p>[IMAGE:1] intro.</p><p>Compare them. [CTA:1]</p><p>Or [CTA:2] instead.</p>'
  const out = renderPostTokens(html, { products: withImages, storeName: 'Frizzlife' })
  for (const p of withImages) {
    assert.ok(out.includes(`href="${p.url}"`), `${p.title} không còn đường mua nào`)
  }
})

test('⚠️ [IMAGE:n] giua doan van -> cat doan van, KHONG nhet <div> vao trong <p>', () => {
  // <div> trong <p> la HTML khong hop le: trinh duyet dong the <p> lai ngay truoc no,
  // nua doan van con lai bi nem ra ngoai vung <p> va mat luon khoang cach dong.
  const out = renderPostTokens('<p>Before. [IMAGE:1] After.</p>', { products })
  // "co mot the <p> chua dong nao dang mo ngay truoc the san pham khong".
  const inside = /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*<div class="article-card"/
  assert.ok(!inside.test(out), 'thẻ không được nằm trong <p>: ' + out)
  assert.match(out, /<p>Before\. <\/p>/)
  assert.match(out, /<p> After\.<\/p>/)
})

test('[TABLE] dung kieu bang chung cua globals.css', () => {
  const out = renderPostTokens('<p>x</p>[TABLE]', {
    products,
    comparisonRows: [{ label: 'Flow rate', values: ['400 GPD', '600 GPD'] }],
  })
  assert.match(out, /class="article-table-wrap"/)
  assert.match(out, /<th scope="row">Flow rate<\/th>/)
  assert.match(out, /<td data-idx="1">400 GPD<\/td><td data-idx="2">600 GPD<\/td>/)
  // Khong nhoi <style> vao tung bai.
  assert.ok(!out.includes('<style'))
})

test('🚨 mỗi ô giá trị phải đeo số của sản phẩm — nếu không, điện thoại mất cột thứ hai', () => {
  // Đo 28/08/2026 trên 390px: bảng ba cột rộng hơn màn hình nên cột sản phẩm thứ
  // hai nằm hoàn toàn ngoài khung. Bố cục xếp chồng ở globals.css dựng lại quan hệ
  // "giá trị này của sản phẩm nào" HOÀN TOÀN dựa vào `data-idx` + `.cmp-idx`.
  // Bỏ một trong hai là bảng so sánh trên điện thoại mất nghĩa mà không báo lỗi gì.
  const out = renderPostTokens('[TABLE]', {
    products,
    comparisonRows: [
      { label: 'Flow rate', values: ['400 GPD', '600 GPD'] },
      { label: 'Tank', values: ['None', 'None'] },
    ],
  })
  assert.match(out, /class="cmp-table cmp-fit"/, 'thiếu class thì CSS xếp chồng không bắt được')
  // Đầu bảng: tiêu đề đầy đủ hiện MỘT LẦN, kèm số.
  assert.match(out, /<th scope="col"><span class="cmp-idx">1<\/span>/)
  assert.match(out, /<th scope="col"><span class="cmp-idx">2<\/span>/)
  // Mọi ô giá trị đều mang số — đếm để không sót hàng nào.
  assert.equal((out.match(/data-idx="1"/g) ?? []).length, 2)
  assert.equal((out.match(/data-idx="2"/g) ?? []).length, 2)
  assert.equal((out.match(/<td(?![^>]*data-idx)/g) ?? []).length, 0, 'có ô giá trị không đeo số')
})

test('⚠️ bảng NHIỀU cột không được chia đều — 12 sản phẩm thành 61px mỗi cột', () => {
  // Đo 28/08: bật `table-layout:fixed` cho bài 12 sản phẩm làm chữ vỡ từng chữ cái
  // một dòng. Tệ hơn hẳn bản cuộn ngang. Ngưỡng là 3.
  const nhieu = Array.from({ length: 12 }, (_, i) => ({ url: `https://x.com/${i}`, title: `P${i}` }))
  const raNhieu = renderPostTokens('[TABLE]', {
    products: nhieu,
    comparisonRows: [{ label: 'Weight', values: nhieu.map(() => '310GSM') }],
  })
  assert.match(raNhieu, /class="cmp-table"/)
  assert.ok(!raNhieu.includes('cmp-fit'), '12 sản phẩm mà vẫn chia đều cột')

  // Đúng 3 sản phẩm vẫn ở trong ngưỡng.
  const ba = nhieu.slice(0, 3)
  const raBa = renderPostTokens('[TABLE]', {
    products: ba,
    comparisonRows: [{ label: 'Weight', values: ba.map(() => '310GSM') }],
  })
  assert.match(raBa, /class="cmp-table cmp-fit"/)
})

test('khong co bang thi [TABLE] bien mat', () => {
  const out = renderPostTokens('<p>x</p>[TABLE]', { products })
  assert.ok(!out.includes('[TABLE]'))
  assert.ok(!out.includes('<table'))
})

test('⚠️ sau khi render KHONG con the nao lot ra mat nguoi doc', () => {
  const html =
    '<h2>Choice</h2><p>[PRODUCT:1] vs [PRODUCT:2]. [IMAGE:1]</p>[TABLE]' +
    '<p>Buy [CTA:1] at [PRICE:1] or [CTA:2] at [PRICE:2].</p><p>Code [COUPON].</p>'
  const out = renderPostTokens(html, {
    products,
    storeName: 'Frizzlife',
    comparisonRows: [{ label: 'Flow rate', values: ['400 GPD', '600 GPD'] }],
    coupon: { code: 'OFFERDY' },
  })
  assert.deepEqual(remainingTokens(out), [])
  assert.match(out, /Frizzlife PD400/)
})

test('ca khi thieu het du lieu, van khong the nao sot lai', () => {
  const html = '<p>[PRODUCT:9] [IMAGE:9] [CTA:9] [PRICE:9] [WAS:9] [TABLE] [COUPON]</p>'
  assert.deepEqual(remainingTokens(renderPostTokens(html, { products: [] })), [])
})

test('chu khong bi coi la the HTML — noi dung shop duoc thoat ky tu', () => {
  const nasty: RenderProduct[] = [{ url: 'https://x.com/a', title: '<script>alert(1)</script>' }]
  const out = renderPostTokens('<p>[PRODUCT:1]</p>', { products: nasty })
  assert.ok(!out.includes('<script>'))
  assert.match(out, /&lt;script&gt;/)
})

test('dong "gia tai thoi diem viet" chi hien khi that su co gia', () => {
  assert.match(priceNote(products) ?? '', /captured on 2026-08-05/)
  assert.equal(priceNote([{ url: 'https://x.com/a', title: 'A', capturedAt: '2026-08-05T00:00:00Z' }]), null)
  assert.equal(priceNote([]), null)
})

// ── `[PRODUCT:n|short]` ───────────────────────────────────────────────
//
// Ly do ton tai: bai PoshRug dang chay that co 12/12 doan mo dau bang mot chuoi
// marketing muoi bon tu. Model khong co loi thoat nao vi `[PRODUCT:n]` chi co MOT dang.

/** Ba cai tham co PHAN DINH DANH y het nhau — tap that, xem `productShortName.test.ts`. */
const rugs: RenderProduct[] = [
  { url: 'https://poshrug.com/a', title: 'Cowhide Area Rug – Brown & Black Modern Accent' },
  { url: 'https://poshrug.com/b', title: 'Cowhide Area Rug – Handmade Black & White Accent' },
  { url: 'https://poshrug.com/c', title: 'Cowhide Area Rug – Black & White Modern Accent Rug' },
]

test('[PRODUCT:n|short] in ten ngan, [PRODUCT:n] van in ten day du', () => {
  const out = renderPostTokens('<p>[PRODUCT:1] rồi [PRODUCT:1|short]</p>', {
    products: rugs, storeName: 'PoshRug',
  })
  assert.match(out, /Cowhide Area Rug – Brown &amp; Black Modern Accent/)
  assert.match(out, /Brown &amp; Black Rug/)
  assert.deepEqual(remainingTokens(out), [])
})

test('⚠️ bien the LA roi ve ten day du, khong bao gio lo the ra trang', () => {
  // Cong kiem luc GHI da chan bien the la roi. Render la hang rao cuoi, va luat cua no
  // la khong bao gio de nguoi doc nhin thay mot the — nen o day phai khoan dung.
  const out = renderPostTokens('<p>[PRODUCT:2|plural]</p>', { products: rugs, storeName: 'PoshRug' })
  assert.match(out, /Cowhide Area Rug – Handmade/)
  assert.deepEqual(remainingTokens(out), [])
})

test('⚠️ remainingTokens bat ca the DI DANG', () => {
  // Bat hep thi mot the sai chinh ta lot qua ca phep thay the lan phep kiem nay, roi
  // hien nguyen dang cho nguoi doc.
  assert.deepEqual(remainingTokens('<p>[PRODUCT:3|SHORT]</p>'), ['[PRODUCT:3|SHORT]'])
  assert.deepEqual(remainingTokens('<p>[CTA:1|plural]</p>'), ['[CTA:1|plural]'])
})

test('the |short khong pha bo cuc: van tach anh va nang CTA cuoi doan', () => {
  const out = renderPostTokens('<p>[PRODUCT:1|short] hợp phòng khách [CTA:1]</p>', {
    products: rugs, storeName: 'PoshRug',
  })
  assert.match(out, /Brown &amp; Black Rug/)
  // `[CTA:n]` dinh cuoi doan -> the san pham, va the mang ten DAY DU (mo neo dinh danh).
  assert.match(out, /article-card-name">Cowhide Area Rug – Brown/)
  assert.deepEqual(remainingTokens(out), [])
})
