/**
 * `checkUrl` — phan biet "khong ket luan duoc" voi "da kiem va thay chet".
 *
 * Vi sao test nay ton tai: nhan `linkStatus: 'broken'` la thu **vinh vien khong
 * tu lanh** khi offer khong co URL — `CANDIDATES_QUERY` cua cron doi phai co URL
 * nen khong bao gio quet lai. Do ngay 2026-08-20: 2 offer dang bat cua Cloud
 * Cushion Slides mang nhan 'broken' voi `link` va `productUrl` deu `null`, va
 * bang dieu khien admin bao do "Offer link hong: 2 — mat click that su" trong
 * khi so dung la 0.
 *
 * Chi test cac nhanh khong can mang. Nhanh HTTP that (>=400 la broken, timeout
 * la indeterminate) da co bang chung van hanh tu su co Cycleaddons 26/07 va
 * khong dang keo mot may chu gia vao bo test.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkUrl, BROKEN_LINK_GROQ, landedOnRoot } from '../src/lib/checkOfferLink'

test('URL rong: khong ket luan duoc, KHONG phai hong', async () => {
  const r = await checkUrl('')
  assert.equal(r.ok, false)
  assert.equal(r.indeterminate, true, 'phai co indeterminate de noi goi khong ghi de linkStatus')
})

test('URL khong parse duoc: khong ket luan duoc', async () => {
  for (const bad of ['khong-phai-url', '???', 'http://', ' ']) {
    const r = await checkUrl(bad)
    assert.equal(r.indeterminate, true, `"${bad}" phai la indeterminate`)
  }
})

test('sai protocol: khong ket luan duoc, va noi ro protocol nao', async () => {
  const r = await checkUrl('ftp://example.com/x')
  assert.equal(r.ok, false)
  assert.equal(r.indeterminate, true)
  assert.match(r.error ?? '', /ftp:/)
})

test('javascript: bi tu choi va khong bao gio bi ghi thanh broken', async () => {
  const r = await checkUrl('javascript:alert(1)')
  assert.equal(r.ok, false)
  assert.equal(r.indeterminate, true)
})

/**
 * ⚠️ 403 KHONG phai "trang da chet" — do that 28/08 tren 8 offer mang nhan broken:
 * 5 offer Apollo Moda tra 403 Cloudflare cho `fetch()`, 2 offer WoWGadgets99 tra
 * 200 voi trang san pham that, va chi 1 offer (Urtopia) chet mem that. 7/8 la bao
 * dong gia, va bao cao AI van dem chung vao "5 lien ket hong" de nguoi van hanh
 * di sua mot thu khong hong.
 *
 * Cung ho voi Cycleaddons 26/07: mot phep do KHONG KET LUAN DUOC bi ghi thanh mot
 * ket luan.
 */
test('⚠️ 401/403/429 la chan truy cap, khong ket luan duoc — KHONG phai broken', async () => {
  const fetchThat = globalThis.fetch
  try {
    for (const ma of [401, 403, 429]) {
      globalThis.fetch = (async () => new Response(null, { status: ma })) as typeof globalThis.fetch
      const r = await checkUrl('https://apollomoda.com/products/mens-aloha-green')
      assert.equal(r.ok, false, `${ma} van la that bai`)
      assert.equal(r.indeterminate, true, `${ma} phai la indeterminate, khong duoc ghi de linkStatus`)
      assert.equal(r.status, ma, 'van phai giu ma de nguoi van hanh doc duoc')
    }
  } finally {
    globalThis.fetch = fetchThat
  }
})

test('404/410/500 van la BROKEN — vong chan moi khong duoc noi rong ra ca ho nay', async () => {
  const fetchThat = globalThis.fetch
  try {
    for (const ma of [404, 410, 500]) {
      globalThis.fetch = (async () => new Response(null, { status: ma })) as typeof globalThis.fetch
      const r = await checkUrl('https://newurtopia.de/products/da-bi-go')
      assert.equal(r.ok, false)
      assert.notEqual(r.indeterminate, true, `${ma} PHAI ket luan duoc la hong`)
    }
  } finally {
    globalThis.fetch = fetchThat
  }
})

test('BROKEN_LINK_GROQ doi offer PHAI co url — ca defined() lan != ""', () => {
  assert.match(BROKEN_LINK_GROQ, /linkStatus == "broken"/)
  // ⚠️ Ca HAI menh de, va day khong phai chi tiet vun vat: trong GROQ
  // `null != ""` cho TRUE, nen thieu `defined()` la vong chan khong chan gi ca.
  // Do that tren production 2026-08-20: ban thieu `defined()` van dem ra 2 —
  // y het khi khong co vong chan nao.
  assert.match(BROKEN_LINK_GROQ, /defined\(coalesce\(productUrl, link\)\)/)
  assert.match(BROKEN_LINK_GROQ, /coalesce\(productUrl, link\) != ""/)
})

// ── landedOnRoot: "chet mem" ─────────────────────────────────────
//
// Hai nhom test nay quan trong ngang nhau. Nhom bat duoc thi de nghi ra; nhom
// KHONG DUOC bat moi la thu giu cho ban va nay khong lap lai su co Cycleaddons
// 26/07 (gan nhan hong oan roi tat deep-link cua store nhieu click nhat site).

test('bat duoc: trang san pham bi day ve trang goc cua shop', () => {
  // Hai ca that, do duoc 2026-08-20 tren 181 deep-link dang bat
  assert.equal(
    landedOnRoot('https://clawsienails.com/products/ondine-short-almond-press-on-nails', 'https://clawsienails.com/'),
    true
  )
  assert.equal(
    landedOnRoot('https://newurtopia.de/products/urtopia-bundle-carbon-1-pro-carbon-fusion', 'https://newurtopia.de/'),
    true
  )
})

test('bat duoc ca khi trang goc khong co dau / o cuoi', () => {
  assert.equal(landedOnRoot('https://shop.com/products/x', 'https://shop.com'), true)
})

test('KHONG bat: san pham van o dung trang san pham', () => {
  assert.equal(
    landedOnRoot('https://clawsienails.com/products/aqua-medium-almond-press-on-nails',
                 'https://clawsienails.com/products/aqua-medium-almond-press-on-nails'),
    false
  )
})

test('KHONG bat: bi day sang trang DANH MUC — do van la dich hop ly', () => {
  // Nhieu shop day san pham het hang sang collection; khach van thay hang tuong
  // tu. Gop ca truong hop nay vao la gan nhan hong cho shop dang chay tot.
  assert.equal(landedOnRoot('https://shop.com/products/x', 'https://shop.com/collections/nails'), false)
})

test('KHONG bat: doi slug san pham van la dich hop ly', () => {
  assert.equal(landedOnRoot('https://shop.com/products/old-slug', 'https://shop.com/products/new-slug'), false)
})

test('KHONG bat: chinh URL ban dau da la trang goc', () => {
  // Kiem link shop ma bao "bi day ve trang goc" la vo nghia — day la ly do
  // cron phai truyen `isProduct`, va la vong chan thu hai o ngay trong ham.
  assert.equal(landedOnRoot('https://shop.com/', 'https://shop.com/'), false)
  assert.equal(landedOnRoot('https://shop.com', 'https://shop.com/'), false)
})

test('KHONG bat: thieu finalUrl hoac URL hong thi khong ket luan', () => {
  assert.equal(landedOnRoot('https://shop.com/products/x', undefined), false)
  assert.equal(landedOnRoot('khong-phai-url', 'https://shop.com/'), false)
  assert.equal(landedOnRoot('https://shop.com/products/x', 'cung-khong-phai-url'), false)
})

test('KHONG bat: sang ten mien khac ma van co duong dan', () => {
  // Doi domain la chuyen rieng; o day chi hoi "co con tro toi mot trang cu the
  // khong". Con tro toi trang cu the thi khong phai chet mem.
  assert.equal(landedOnRoot('https://shop.com/products/x', 'https://other.com/products/x'), false)
})
