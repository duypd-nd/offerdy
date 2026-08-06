/**
 * Dau hieu van do MAY viet.
 *
 * Ca dat cuoc nang nhat khong phai la bat duoc `boasts` — do la phan de. Nang nhat la
 * **KHONG bat oan dau `—` trong `comparisonRows`**: chinh prompt bat o khong co nguon
 * phai ghi `—`, nen mot bo kiem quet dau gach tren toan bo chu se chan gan nhu moi bai.
 * Mot bo kiem chan het thi khong ai bat no chay lan thu hai.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findAiTells, BANNED_PHRASES, MAX_PRODUCT_LED_PARAGRAPHS } from '@/lib/ai/aiTells'
import { SYSTEM_PROMPT } from '@/lib/ai/generateArticleContent'

/** Mot bai sach toi thieu; moi test doi dung mot cho. */
function tells(over: { dashText?: string; wordText?: string; contentHtml?: string } = {}) {
  const contentHtml =
    over.contentHtml ??
    '<h2>The choice</h2><p>[PRODUCT:1] runs tankless. It doesn\'t need a tank.</p>' +
    '<p>[TABLE]</p><p>Buy [CTA:1] or [CTA:2].</p>'
  const prose = over.dashText ?? contentHtml
  return findAiTells({
    dashText: prose,
    wordText: over.wordText ?? prose,
    contentHtml,
  })
}

test('bai sach -> khong loi nao', () => {
  const p = tells()
  assert.deepEqual(p.hard, [])
  assert.deepEqual(p.soft, [])
})

test('⚠️ dau "—" trong comparisonRows KHONG bi chan', () => {
  // ABSOLUTE RULE 6 cua chinh prompt: o khong co nguon phai ghi `—`. Neu ca nay do thi
  // gan nhu moi bai bi chan, va tinh nang nay chet ngay tu lan chay dau.
  const p = findAiTells({
    dashText: '<p>Both run tankless.</p>',
    wordText: '<p>Both run tankless.</p>\nNoise level\n—\n—',
    contentHtml: '<p>Both run tankless.</p>',
  })
  assert.deepEqual(p.hard, [])
})

test('dau "—" trong than bai -> loi cung', () => {
  const p = tells({ contentHtml: '<p>The PX600 — the bigger unit — costs more.</p>' })
  assert.match(p.hard.join(' '), /gạch ngang dài/)
})

test('cum bi cam -> loi cung, va neu dung chuoi vi pham', () => {
  const p = tells({ contentHtml: '<p>The shop boasts a hand-knotted surface.</p>' })
  assert.equal(p.hard.length, 1)
  assert.match(p.hard[0], /"boasts"/)
  assert.match(p.hard[0], /hand-knotted surface/)
})

test('doi lap gia bi bat', () => {
  assert.match(tells({ contentHtml: "<p>It's not just a rug, it's a statement.</p>" }).hard.join(' '), /đối lập giả/)
  assert.match(tells({ contentHtml: '<p>Not only does it filter, but it also chills.</p>' }).hard.join(' '), /not only/)
  assert.match(tells({ contentHtml: '<p>Despite its size, it faces several challenges.</p>' }).hard.join(' '), /Despite/)
})

test('⚠️ dau nhay cong van bi bat', () => {
  // Luat van phong YEU CAU viet tat, nen model hay go dau nhay cong. Khong nan truoc
  // khi so khop thi `"it's worth noting"` trong danh sach cam khong bao gio khop — mot
  // bo cam im lang la mot bo cam khong ton tai.
  const p = tells({ contentHtml: '<p>It’s worth noting that both are tankless.</p>' })
  assert.match(p.hard.join(' '), /it's worth noting/)
})

test('rac ky thuat cua chatbot -> loi cung', () => {
  assert.match(tells({ contentHtml: '<p>Both are tankless :contentReference[oaicite:3]</p>' }).hard.join(' '), /rác kỹ thuật/)
})

test('Markdown lot vao HTML -> loi cung', () => {
  assert.match(tells({ contentHtml: '<p>The **bigger** one.</p>' }).hard.join(' '), /Markdown/)
  assert.match(tells({ contentHtml: '## Heading\n<p>x</p>' }).hard.join(' '), /## tiêu đề/)
  assert.match(tells({ contentHtml: '<p>x</p>\n- first item\n- second' }).hard.join(' '), /gạch đầu dòng/)
})

test('emoji trong than bai -> loi cung', () => {
  assert.match(tells({ contentHtml: '<p>Great value 🔥</p>' }).hard.join(' '), /emoji/)
})

test('boi dam may moc -> loi cung', () => {
  const html = '<p><strong>a</strong><strong>b</strong><strong>c</strong><strong>d</strong></p>'
  assert.match(tells({ contentHtml: html }).hard.join(' '), /in đậm/)
  // Ba cai thi khong sao — nguong rong co chu dich.
  assert.deepEqual(tells({ contentHtml: '<p><strong>a</strong><strong>b</strong><strong>c</strong></p>' }).hard, [])
})

test('⚠️ doan mo dau bang ten san pham: 2 thi qua, 3 thi chan', () => {
  // Ban do duoc CHINH XAC cua tat lon nhat — bai PoshRug that co 12/12 doan nhu vay.
  const two = '<p>[PRODUCT:1] is small.</p><p>[PRODUCT:2|short] is big.</p><p>Both run tankless.</p>'
  assert.deepEqual(tells({ contentHtml: two }).hard, [])

  const three = two.replace('<p>Both run', '<p>[PRODUCT:3] is bigger.</p><p>Both run')
  const p = tells({ contentHtml: three })
  assert.match(p.hard.join(' '), new RegExp(`tối đa ${MAX_PRODUCT_LED_PARAGRAPHS}`))
})

test('tang MEM khong bao gio vao tang CUNG', () => {
  for (const html of [
    '<p>A premium build, ensuring long life.</p>',
    '<p>A comprehensive and versatile filter.</p>',
    '<p>The shop says it fits. The shop says it filters. The shop says it lasts. The shop says it chills.</p>',
  ]) {
    const p = tells({ contentHtml: html })
    assert.deepEqual(p.hard, [], html)
    assert.ok(p.soft.length > 0, html)
  }
})

test('tieu de muc Title Case -> canh bao MEM, khong chan', () => {
  const p = tells({ contentHtml: '<h2>Where The Extra Money Goes</h2><p>x</p>' })
  assert.deepEqual(p.hard, [])
  assert.match(p.soft.join(' '), /Title Case/)
  // Tieu de kieu cau thuong thi khong bao.
  assert.deepEqual(tells({ contentHtml: '<h2>Where the extra money goes</h2><p>x</p>' }).soft, [])
})

test('danh sach cam khong co cum nao trung nhau', () => {
  // Trung thi mot loi bao hai lan, va nguoi doc thoi tin ban dem.
  const seen = new Set<string>()
  for (const p of BANNED_PHRASES) {
    assert.ok(!seen.has(p), `"${p}" xuất hiện hai lần`)
    seen.add(p)
  }
})

test('⚠️ cum cam phai co ranh gioi tu', () => {
  // `elevate` khong duoc khop trong `elevated`, khong thi moi cau ta cai thang may deu
  // bi chan.
  assert.deepEqual(tells({ contentHtml: '<p>An elevated platform holds the tank.</p>' }).hard, [])
  assert.match(tells({ contentHtml: '<p>These elevate your kitchen.</p>' }).hard.join(' '), /elevate/)
})

// ── Chinh cai PROMPT khong duoc pham luat no dat ra ──────────────────

test('⚠️ prompt khong duoc dung dau "—", tru dung cho no BAT phai dung', () => {
  // Model bat chuoc van phong cua chinh cau lenh no doc. Mot prompt vua cam dau gach
  // ngang vua dung no bon lan la mot prompt tu chong lai minh — va vi day la loi CUNG,
  // hau qua khong phai van xau ma la moi bai deu bi chan.
  //
  // Ngoai le duy nhat duoc phep: cau dan model ghi `—` vao o bang khong co nguon
  // (ABSOLUTE RULE 6). Do la noi dung bat buoc, khong phai van phong.
  const hits = [...SYSTEM_PROMPT.matchAll(/.{0,25}—.{0,25}/g)].map(m => m[0])
  const stray = hits.filter(h => !/write "—"/.test(h))
  assert.deepEqual(stray, [], 'prompt còn dấu gạch ngang dài ngoài chỗ được phép')
})

test('danh sach cam in nguyen van vao prompt, khong co ban sao thu hai', () => {
  // Mot ban chep tay se lech khoi `BANNED_PHRASES` ngay lan sua dau tien, va luc do
  // model bi cham diem theo mot danh sach no chua bao gio duoc doc.
  for (const phrase of BANNED_PHRASES) {
    assert.ok(SYSTEM_PROMPT.includes(phrase), `prompt thiếu cụm bị cấm "${phrase}"`)
  }
})

test('prompt noi dung con so ma bo kiem thuc su dung', () => {
  assert.ok(SYSTEM_PROMPT.includes(`At most ${MAX_PRODUCT_LED_PARAGRAPHS} paragraphs`))
})

test('⚠️ the anh dung dau doan KHONG che duoc cho tat nay', () => {
  // `[IMAGE:n]` va `[CTA:n]` dinh dau doan bi keo RA KHOI `<p>` luc render, nen doan
  // van nguoi doc thay van bat dau bang ten san pham. Ban dau cua phep dem bo sot dung
  // cho do: bai PoshRug that co 12/16 doan dang `[IMAGE:n] [PRODUCT:n] …` va no chi
  // dem duoc 1 — mot bo kiem dem hut chinh cai no sinh ra de bat.
  const html = [1, 2, 3].map(n => `<p>[IMAGE:${n}] [PRODUCT:${n}] is nice. [CTA:${n}]</p>`).join('')
  assert.match(tells({ contentHtml: html }).hard.join(' '), /3\/3 đoạn mở đầu bằng tên sản phẩm/)
})
