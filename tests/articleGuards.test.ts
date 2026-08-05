/**
 * Hau kiem than bai do AI viet.
 *
 * Chia CUNG/MEM la phan dang doc ky: loi cung la loi khong the song chung (mot con so
 * tien do model go ra thi ca bai het dang tin), con loi mem la thu **may khong quyet
 * duoc** va phai dua cho nguoi duyet nhin.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findUnsafeArticle, type ArticleContent, type ArticleGuardContext } from '@/lib/ai/generateArticleContent'

const ctx: ArticleGuardContext = {
  storeName: 'Frizzlife',
  productCount: 2,
  sourceText: [
    'Frizzlife PD600-TAM3 600GPD Tankless Reverse Osmosis Water Filter System',
    'Frizzlife PX600 600GPD Tankless Reverse Osmosis Water Filter System',
    'Removes chlorine and lead. Fits under most sinks.',
  ],
  imageCounts: [3, 2],
  hasCoupon: true,
  year: 2026,
}

/** Bai sach toi thieu — moi test chi doi mot cho. */
function article(over: Partial<ArticleContent> = {}): ArticleContent {
  return {
    title: 'PD600-TAM3 vs PX600 Reverse Osmosis Systems',
    excerpt: 'Which tankless system fits your sink.',
    contentHtml:
      '<h2>The choice</h2><p>[PRODUCT:1] and [PRODUCT:2] both run tankless. [IMAGE:1] [IMAGE:2]</p>' +
      '<p>[TABLE]</p><p>Buy [CTA:1] or [CTA:2] at [PRICE:1] and [PRICE:2].</p>',
    metaTitle: 'PD600-TAM3 vs PX600 Water Filters',
    metaDescription: 'A side by side look at two tankless systems.',
    coverEmoji: '💧',
    coverBg: 'home-green',
    readTime: 5,
    faq: [
      { question: 'Does it fit under a sink?', answer: 'The shop says it fits most sinks.' },
      { question: 'Is a tank needed?', answer: 'No, both are tankless.' },
      { question: 'What does it remove?', answer: 'Chlorine and lead, per the shop.' },
      { question: 'Which one is quieter?', answer: 'The shop does not say.' },
    ],
    comparisonRows: [{ label: 'Flow rate', values: ['600 GPD', '600 GPD'] }],
    crossComparisonInsight: 'Both units are rated the same, so the gap buys features rather than capacity.',
    notAnswered: ['Neither page states noise level.'],
    ...over,
  }
}

test('bai sach -> khong loi cung nao', () => {
  const p = findUnsafeArticle(article(), ctx)
  assert.deepEqual(p.hard, [])
})

test('⚠️ chinh cac the vuong KHONG duoc bao la ten rieng la', () => {
  // [CTA:1], [IMAGE:1], [TABLE] deu la chu in hoa. Khong go the truoc khi quet thi
  // bai nao cung de 5 dong canh bao rac — va mot danh sach lan nao cung co rac la
  // mot danh sach khong ai doc nua.
  const p = findUnsafeArticle(article(), ctx)
  assert.deepEqual(p.soft.filter(s => /CTA|IMAGE|TABLE|PRODUCT|PRICE/.test(s)), [])
})

// ── Loi CUNG ──────────────────────────────────────────────────────────

test('⚠️ model tu viet so tien -> loi cung', () => {
  const p = findUnsafeArticle(article({ contentHtml: article().contentHtml + '<p>Only $199 today.</p>' }), ctx)
  assert.match(p.hard.join(' '), /tự viết số tiền/)
})

test('phan tram do model go ra cung bi bat', () => {
  const p = findUnsafeArticle(article({ excerpt: 'Save 30% right now.' }), ctx)
  assert.match(p.hard.join(' '), /tự viết số tiền/)
})

test('⚠️ phan tram CO THAT trong mo ta shop thi duoc giu', () => {
  // Bai viet khac caption o dung cho nay: "removes 99% of chlorine" la thong tin dung
  // nhat cua ca bai neu shop that su viet the. Chan het thi vua mat thong tin tot
  // nhat, vua bien mot bo loc dang tin thanh bo loc hay bao dong gia.
  const withPct = {
    ...ctx,
    sourceText: [...ctx.sourceText, 'Removes 99% of chlorine, per the manufacturer.'],
  }
  assert.deepEqual(findUnsafeArticle(article({ excerpt: 'It removes 99% of chlorine.' }), withPct).hard, [])
  // Nhung mot con so khac thi van bi chan.
  assert.match(
    findUnsafeArticle(article({ excerpt: 'It removes 450% of chlorine.' }), withPct).hard.join(' '),
    /"450%"/
  )
})

test('so tien thi chan bat ke nguon co hay khong', () => {
  const withPrice = { ...ctx, sourceText: [...ctx.sourceText, 'Now $298.75 only'] }
  assert.match(findUnsafeArticle(article({ excerpt: 'Just $298.75.' }), withPrice).hard.join(' '), /tự viết số tiền/)
})

test('the [PRICE:n] KHONG bi nham la so tien', () => {
  assert.deepEqual(findUnsafeArticle(article(), ctx).hard, [])
})

test('⚠️ tu viet <a> -> loi cung (link ra ngoai se khong mang ref)', () => {
  const p = findUnsafeArticle(article({ contentHtml: article().contentHtml + '<a href="https://x.com">buy</a>' }), ctx)
  assert.match(p.hard.join(' '), /thẻ <a>/)
})

test('tu viet <img> -> loi cung', () => {
  const p = findUnsafeArticle(article({ contentHtml: article().contentHtml + '<img src="x.jpg">' }), ctx)
  assert.match(p.hard.join(' '), /thẻ <img>/)
})

test('the la -> loi cung', () => {
  const p = findUnsafeArticle(article({ contentHtml: article().contentHtml + '<p>[VIDEO:1]</p>' }), ctx)
  assert.match(p.hard.join(' '), /thẻ lạ "\[VIDEO:1\]"/)
})

test('chi so vuot so san pham -> loi cung', () => {
  const p = findUnsafeArticle(article({ contentHtml: article().contentHtml + '<p>[CTA:5]</p>' }), ctx)
  assert.match(p.hard.join(' '), /trỏ tới sản phẩm 5 nhưng bài chỉ có 2/)
})

test('⚠️ san pham khong co [CTA:n] nao -> loi cung', () => {
  // Bai 2 san pham ma mot nut mua thi san pham con lai khong co duong mua — mat hoa
  // hong am tham, va am tham la kieu that thu te nhat.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>[CTA:1] only, and [IMAGE:1] [PRICE:1] [PRICE:2].</p>' }),
    ctx
  )
  assert.match(p.hard.join(' '), /sản phẩm 2 không có \[CTA:n\] nào/)
})

test('⚠️ san pham cao duoc anh ma bai khong dat [IMAGE:n] -> loi cung', () => {
  // Bai so sanh ma vai san pham khong co hinh thi nguoi doc khong so duoc bang mat —
  // ma dat canh nhau chinh la ly do bai ton tai.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>[IMAGE:1] only. [CTA:1] [CTA:2] [PRICE:1]</p>' }),
    ctx
  )
  assert.match(p.hard.join(' '), /sản phẩm 2 không có \[IMAGE:n\] nào dù đã cào được ảnh/)
})

test('san pham KHONG cao duoc anh nao -> canh bao mem, khong chan bai', () => {
  // Do la van de du lieu, khong phai loi cua model.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>[IMAGE:1] x. [CTA:1] [CTA:2] [PRICE:1]</p>' }),
    { ...ctx, imageCounts: [3, 0] }
  )
  assert.deepEqual(p.hard, [])
  assert.match(p.soft.join(' '), /sản phẩm 2 không cào được ảnh nào/)
})

test('[IMAGE:n] cho san pham khong cao duoc anh -> loi cung', () => {
  const p = findUnsafeArticle(
    article({ contentHtml: article().contentHtml + '<p>[IMAGE:2]</p>' }),
    { ...ctx, imageCounts: [3, 0] }
  )
  assert.match(p.hard.join(' '), /sản phẩm 2 không cào được ảnh nào/)
})

test('[COUPON] khi shop khong co ma -> loi cung', () => {
  const p = findUnsafeArticle(
    article({ contentHtml: article().contentHtml + '<p>Use [COUPON].</p>' }),
    { ...ctx, hasCoupon: false }
  )
  assert.match(p.hard.join(' '), /không có mã giảm nào/)
})

test('the khong chi so ma mang chi so -> loi cung', () => {
  const p = findUnsafeArticle(article({ contentHtml: '<p>[TABLE:1] [CTA:1] [CTA:2]</p>' }), ctx)
  assert.match(p.hard.join(' '), /không được mang chỉ số/)
})

test('tieu de chua Offerdy -> loi cung', () => {
  const p = findUnsafeArticle(article({ title: 'Best Filters | Offerdy' }), ctx)
  assert.match(p.hard.join(' '), /Offerdy/)
})

test('nam sai -> loi cung', () => {
  const p = findUnsafeArticle(article({ excerpt: 'Updated for 2023.' }), ctx)
  assert.match(p.hard.join(' '), /nhắc năm "2023"/)
})

test('so o trong bang phai khop so san pham', () => {
  const p = findUnsafeArticle(article({ comparisonRows: [{ label: 'Flow', values: ['600 GPD'] }] }), ctx)
  assert.match(p.hard.join(' '), /có 1 ô nhưng bài có 2 sản phẩm/)
})

// ── Loi MEM ───────────────────────────────────────────────────────────

test('⚠️ ten rieng la -> canh bao MEM, bai van duoc tao', () => {
  const p = findUnsafeArticle(
    article({ contentHtml: article().contentHtml + '<p>It beats the Waterdrop G3 easily.</p>' }),
    ctx
  )
  assert.deepEqual(p.hard, [], 'day la viec may khong quyet duoc — khong duoc chan cung')
  assert.match(p.soft.join(' '), /Waterdrop/)
})

test('tu dau cau KHONG bi coi la ten rieng', () => {
  // Tieng Anh viet hoa tu dau cau theo luat chinh ta. Khong bo thi moi cau de mot
  // bao dong gia, va bao dong gia lam nguoi ta thoi doc canh bao.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>Both run tankless. However the choice differs. [CTA:1] [CTA:2] [IMAGE:1]</p>' }),
    ctx
  )
  assert.equal(p.soft.filter(s => s.includes('However')).length, 0)
})

test('LOI THAT: ma model trong bai khong duoc bao la ten rieng la', () => {
  // Chay that lan dau bao "PD" va "PD600-TAM" la ten rieng la. Nguon tach
  // `PD600-TAM3` thanh hai token `pd600` + `tam3`, con bo quet lai cat dau/duoi thanh
  // `PD600-TAM` — mot chuoi khong bao gio khop duoc voi bat cu gi.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>x The PD600-TAM3 sits above the PD line. [CTA:1] [CTA:2] [IMAGE:1]</p>' }),
    ctx
  )
  assert.deepEqual(p.soft.filter(s => s.includes('tên riêng lạ')), [])
})

test('LOI THAT: tu dau mot the KHOI khong bi bao', () => {
  // *"Check the price"* mo dau mot <p> tung bi bao la ten rieng la, vi bo quet chi
  // ngat cau o dau cham.
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>Both run tankless</p><p>Waterdrop beats it</p><p>[CTA:1] [CTA:2] [IMAGE:1]</p>' }),
    ctx
  )
  // "Waterdrop" mo dau mot <p> nen KHONG bi bat — do la cai gia phai tra, va no
  // nghieng ve phia it bao dong gia. Bu lai bang luat cung "khong duoc viet <a>".
  assert.deepEqual(p.soft.filter(s => s.includes('tên riêng lạ')), [])
})

test('ten rieng la GIUA cau van bi bat', () => {
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>x It beats the Waterdrop G3 easily. [CTA:1] [CTA:2] [IMAGE:1]</p>' }),
    ctx
  )
  assert.match(p.soft.join(' '), /Waterdrop/)
})

test('tu co trong ten/mo ta san pham thi khong bi bao', () => {
  const p = findUnsafeArticle(
    article({ contentHtml: '<p>x Reverse Osmosis and Frizzlife and Tankless. [CTA:1] [CTA:2] [IMAGE:1]</p>' }),
    ctx
  )
  assert.deepEqual(p.soft.filter(s => s.includes('tên riêng lạ')), [])
})

test('bai nhieu san pham ma khong co cau doi chieu -> canh bao MEM', () => {
  const p = findUnsafeArticle(article({ crossComparisonInsight: '  ' }), ctx)
  assert.match(p.soft.join(' '), /không nêu được câu đối chiếu nào/)
})
