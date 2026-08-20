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
import { checkUrl, BROKEN_LINK_GROQ } from '../src/lib/checkOfferLink'

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

test('BROKEN_LINK_GROQ doi offer PHAI co url — ca defined() lan != ""', () => {
  assert.match(BROKEN_LINK_GROQ, /linkStatus == "broken"/)
  // ⚠️ Ca HAI menh de, va day khong phai chi tiet vun vat: trong GROQ
  // `null != ""` cho TRUE, nen thieu `defined()` la vong chan khong chan gi ca.
  // Do that tren production 2026-08-20: ban thieu `defined()` van dem ra 2 —
  // y het khi khong co vong chan nao.
  assert.match(BROKEN_LINK_GROQ, /defined\(coalesce\(productUrl, link\)\)/)
  assert.match(BROKEN_LINK_GROQ, /coalesce\(productUrl, link\) != ""/)
})
