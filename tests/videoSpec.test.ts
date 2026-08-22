/**
 * Dựng kịch bản video từ dữ liệu deal.
 *
 * ⚠️ Hai phép kiểm quan trọng nhất ở đây KHÔNG phải về hình thức video, mà về
 * việc **không bịa số**: sản phẩm không có giá gốc thì tuyệt đối không được có
 * cảnh giảm giá, và shop không có mã thì không được có cảnh mã. Dự án này từng
 * hiện "Save €5000" cho một sản phẩm €199,99 — nhưng đó là chữ trên trang web,
 * sửa được. Một con số sai đọc lên trong video đã đăng TikTok thì không.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSpec, tongThoiLuong, docGia, danhVan, NHAN_CHIEN_DICH, type NhipKichBan } from '../src/lib/video/buildSpec'
import { parseCampaign } from '../src/lib/shortLinkSource'

const NHIP: NhipKichBan[] = [
  { type: 'hook', voiceText: 'Tired of aching arms before your baby even naps?', overlayText: 'ACHING ARMS?' },
  { type: 'problem', voiceText: 'Carrying a baby all day strains your back fast.', overlayText: 'BACK STRAIN' },
  { type: 'product', voiceText: 'The CozyRoo Hipseat Carrier from BloomingBabies helps with that.', overlayText: 'COZYROO CARRIER' },
  { type: 'benefit', voiceText: "The padded hip seat shifts baby's weight onto your hips.", overlayText: 'PADDED HIP SEAT' },
  { type: 'benefit', voiceText: 'It adjusts into six positions as your baby grows.', overlayText: 'GROWS WITH BABY' },
  { type: 'benefit', voiceText: 'Pockets and a drool bib keep essentials handy.', overlayText: 'POCKETS INCLUDED' },
]

const DEAL = {
  code: 1470,
  title: 'CozyRoo 6-in-1 Hipseat Carrier',
  slug: 'cozyroo-hipseat',
  priceSale: '$49.95',
  priceOrig: '$89.95',
  discount: 44,
  dealUrl: 'https://bloomingbabies.co/products/baby-hipseat-carrier',
}

const ANH = ['a.jpg', 'b.jpg', 'c.jpg']

// ── Luật số một: không có dữ liệu thì không có cảnh ────────────────

test('KHÔNG có giá gốc thì KHÔNG có cảnh giảm giá', () => {
  const { scenes } = buildSpec({
    deal: { ...DEAL, priceOrig: undefined, discount: undefined },
    images: ANH, beats: NHIP,
  })
  const offer = scenes.filter(s => s.type === 'offer')
  assert.equal(offer.length, 1, 'vẫn nói giá bán, nhưng chỉ một cảnh')
  assert.equal(offer[0].priceBadge, undefined)
  assert.ok(!/down from|off|save/i.test(offer[0].voiceText ?? ''), offer[0].voiceText)
  assert.ok(!scenes.some(s => /\d+\s*%/.test(s.overlayText)), 'không được hiện % nào')
})

test('KHÔNG có giá nào thì KHÔNG có cảnh giá', () => {
  const { scenes } = buildSpec({
    deal: { ...DEAL, priceSale: undefined, priceOrig: undefined, discount: undefined },
    images: ANH, beats: NHIP,
  })
  assert.equal(scenes.filter(s => s.type === 'offer').length, 0)
})

test('KHÔNG có mã thì KHÔNG có cảnh mã, và không chữ nào nhắc tới mã', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: null })
  assert.equal(scenes.filter(s => s.type === 'coupon').length, 0)
  const chu = scenes.map(s => `${s.overlayText} ${s.voiceText ?? ''}`).join(' ')
  assert.ok(!/code/i.test(chu), chu)
})

test('cảnh mã nói MỨC ĐỘ, không hứa — mã là của cả shop, nhiều shop loại trừ hàng giảm giá', () => {
  const { scenes } = buildSpec({
    deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY', storeName: 'BloomingBabies',
  })
  const ma = scenes.find(s => s.type === 'coupon')
  assert.ok(ma)
  assert.equal(ma.couponBadge, 'OFFERDY')
  assert.ok(ma.overlayText.includes('OFFERDY'))
  assert.ok(!/\b(get|use|apply|save|extra)\b/i.test(ma.voiceText ?? ''), ma.voiceText)
})

// ── Ảnh quay vòng ─────────────────────────────────────────────────

test('ít ảnh KHÔNG cắt bớt cảnh — ảnh lặp lại từ đầu', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ['a.jpg'], beats: NHIP, couponCode: 'OFFERDY' })
  assert.equal(scenes.length, NHIP.length + 3, 'sáu nhịp + giá + mã + CTA')
  assert.ok(scenes.every(s => s.image === 'a.jpg'))
})

test('mọi ảnh đều được dùng khi đủ nhịp', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  for (const a of ANH) assert.ok(scenes.some(s => s.image === a), a)
})

test('ảnh trong kho (ảnh thứ nhất) mở màn', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  assert.equal(scenes[0].image, ANH[0])
})

// ── Hình dạng ─────────────────────────────────────────────────────

test('kịch bản đủ nhịp cho video trên 30 giây, khung dọc', () => {
  const spec = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  assert.equal(spec.width, 1080)
  assert.equal(spec.height, 1920)
  assert.ok(tongThoiLuong(spec.scenes) > 30, `mới ${tongThoiLuong(spec.scenes)}s`)
})

test('cảnh cuối luôn là CTA và link có nhãn đo được', () => {
  const spec = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  assert.equal(spec.scenes.at(-1)?.type, 'cta')
  assert.match(String(spec.product.ctaUrl), /\/d\/1470\?s=video$/)
})

test('không có nhịp nào thì dừng, chứ không dựng video rỗng', () => {
  assert.throws(() => buildSpec({ deal: DEAL, images: ANH, beats: [] }), /nhip kich ban/i)
})

test('không có ảnh nào thì dừng', () => {
  assert.throws(() => buildSpec({ deal: DEAL, images: [], beats: NHIP }), /anh/i)
})

test('id cảnh liên tục từ 1', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  assert.deepEqual(scenes.map(s => s.id), scenes.map((_, i) => i + 1))
})

// ── Đọc số thành lời ──────────────────────────────────────────────

test('THẬT: giá đọc thành lời, không đọc dấu chấm', () => {
  // ⚠️ Đọc "$79.95" nguyên văn thì ElevenLabs phát "dollar seventy nine point
  // nine five" — đúng chữ nhưng nghe như máy đọc bảng giá.
  assert.equal(docGia('$79.95'), '79 dollars 95')
  assert.equal(docGia('$49.95'), '49 dollars 95')
  assert.equal(docGia('$120.00'), '120 dollars')
  assert.equal(docGia('$1,299.00'), '1299 dollars')
  assert.equal(docGia('€199,99'), '19999 euro')
  assert.equal(docGia('£25'), '25 pounds')
})

test('mã đọc đánh vần từng chữ', () => {
  assert.equal(danhVan('OFFERDY'), 'O F F E R D Y')
  assert.equal(danhVan('save10'), 'S A V E 1 0')
})

test('màn cuối có cả lời mời mua lẫn chỉ dẫn tìm link', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  const cta = scenes.at(-1)!
  assert.match(cta.overlayText, /SHOP NOW/)
  assert.match(cta.overlayText, /LINK IN BIO/)
})

// ── Link đo được ───────────────────────────────────────────────────
//
// ⚠️ Hai dạng của cùng một địa chỉ, và chúng CỐ Ý khác nhau:
//   · trên màn hình  `offerdy.com/d/1470`          — gõ tay được
//   · trong bio      `https://www.offerdy.com/d/1470?s=video` — đo được
// Không ai gõ tay một chuỗi truy vấn, mà gõ sai thì hỏng cả địa chỉ. Nên đường
// đo được là link ở bio, còn chữ trên màn chỉ lo phần nhớ tên miền.

test('THẬT: link trên màn gõ tay được — không có chuỗi truy vấn', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  const cta = scenes.at(-1)!
  assert.equal(cta.linkText, 'offerdy.com/d/1470')
  assert.ok(!cta.linkText!.includes('?'), 'chữ trên màn không được mang chuỗi truy vấn')
  assert.ok(!cta.linkText!.includes(' '), 'địa chỉ có dấu cách thì gõ ra trang khác')
})

test('chỉ cảnh CTA mới có dòng địa chỉ', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  const coLink = scenes.filter(s => s.linkText)
  assert.equal(coLink.length, 1)
  assert.equal(coLink[0].type, 'cta')
})

test('THẬT: link bio mang nhãn video và sống sót qua parseCampaign', () => {
  const spec = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  const url = new URL(String(spec.product.ctaUrl))
  assert.equal(url.pathname, '/d/1470')
  // ⚠️ `?s=` đi qua `parseCampaign()` — cắt còn [a-z0-9_-] và 24 ký tự. Một nhãn
  // bị cắt mất là một cột trống ở /admin/reports, và không ai nhận ra.
  assert.equal(parseCampaign(url.searchParams.get('s')), NHAN_CHIEN_DICH)
  assert.equal(spec.product.ctaCampaign, NHAN_CHIEN_DICH)
})

test('link bio và link trên màn cùng trỏ về một deal', () => {
  const { scenes, product } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  const duong = new URL(String(product.ctaUrl)).pathname
  assert.ok(String(scenes.at(-1)!.linkText).endsWith(duong), `${scenes.at(-1)!.linkText} vs ${duong}`)
})

// ── Chữ trên màn khớp với giọng đọc ────────────────────────────────
//
// ⚠️ Màn hình và máy đọc cần HAI DẠNG khác nhau của cùng một câu: người xem cần
// thấy `$49.95` và `OFFERDY`, còn máy đọc cần "49 dollars 95" và "O F F E R D Y".
// Trước đây chỉ có một trường nên màn hình phải chịu dạng của máy đọc.

test('cảnh giá: màn hình hiện giá thật, máy đọc đọc thành lời', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  const offer = scenes.find(s => s.type === 'offer')!
  assert.match(offer.voiceText!, /\$49\.95/)
  assert.match(offer.voiceText!, /\$89\.95/)
  assert.match(offer.speakText!, /49 dollars 95/)
  assert.ok(!/\$/.test(offer.speakText!), offer.speakText)
  assert.equal(offer.badgeText, '44% OFF')
})

test('cảnh mã: màn hình hiện mã nguyên, máy đọc đánh vần', () => {
  const { scenes } = buildSpec({
    deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY', storeName: 'BloomingBabies',
  })
  const ma = scenes.find(s => s.type === 'coupon')!
  assert.match(ma.voiceText!, /code OFFERDY\b/)
  assert.match(ma.speakText!, /O F F E R D Y/)
  assert.match(String(ma.badgeText), /OFFERDY/)
})

test('nhịp do AI viết KHÔNG có bản riêng cho máy đọc — nghe sao thấy vậy', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  for (const s of scenes.filter(s => NHIP.some(b => b.type === s.type))) {
    assert.equal(s.speakText, undefined, s.type)
  }
})

test('chỉ ba cảnh cuối có chữ lớn; cảnh kể chuyện chỉ có phụ đề', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP, couponCode: 'OFFERDY' })
  assert.deepEqual(
    scenes.filter(s => s.badgeText).map(s => s.type),
    ['offer', 'coupon', 'cta'],
  )
})

// ── Ảnh nào vào cảnh giá ───────────────────────────────────────────
//
// Đo thật 2026-08-22 trên deal #1470: `scoreImages()` xếp tốt-trước, nên ảnh
// CUỐI danh sách là ảnh tệ nhất — mà cảnh giá lại đang lấy đúng ảnh đó. Lấy lại
// một ảnh Claude chấm 1/10 (ảnh lấy lại xếp cuối) là sơ đồ xương chậu lên làm
// nền cảnh bán hàng quan trọng nhất.

test('cảnh giá lấy ảnh tốt nhất trong số CHƯA dùng, không lấy ảnh cuối', () => {
  // 6 nhịp dùng hết ảnh 0..5; ảnh 6 là ảnh chưa dùng có điểm cao nhất còn lại,
  // ảnh 8 là ảnh tệ nhất (vừa được người vận hành lấy lại nên xếp cuối).
  const anh = ['0.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', 'te-nhat.jpg']
  const { scenes } = buildSpec({ deal: DEAL, images: anh, beats: NHIP })
  const offer = scenes.find(s => s.type === 'offer')!
  assert.equal(offer.image, '6.jpg')
  assert.notEqual(offer.image, 'te-nhat.jpg')
})

test('ít ảnh hơn số nhịp thì cảnh giá vẫn có ảnh (quay vòng)', () => {
  const { scenes } = buildSpec({ deal: DEAL, images: ANH, beats: NHIP })
  const offer = scenes.find(s => s.type === 'offer')!
  assert.ok(ANH.includes(offer.image), offer.image)
})

test('không có giá gốc: cảnh giá bán cũng lấy ảnh chưa dùng', () => {
  const anh = ['0.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', 'te-nhat.jpg']
  const { scenes } = buildSpec({
    deal: { ...DEAL, priceOrig: undefined, discount: undefined },
    images: anh, beats: NHIP,
  })
  const offer = scenes.find(s => s.type === 'offer')!
  assert.equal(offer.image, '6.jpg')
})
