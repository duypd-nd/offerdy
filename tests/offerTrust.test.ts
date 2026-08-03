/**
 * Nhan tin cay tren the offer: bang chung manh hon thi thang, va cach dien dat
 * khong duoc vuot qua thu thuc su da lam.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { offerTrustBadge, fmtDayUtc } from '@/lib/offerTrust'

test('da thu tay -> thang nhan cron, va mang theo cau quan sat', () => {
  const b = offerTrustBadge({
    codeTestedAt: '2026-08-04T09:12:00Z',
    codeTestResult: 'worked',
    codeTestNote: '10% off, no minimum',
    linkCheckedAt: '2026-08-03T06:48:00Z',
  })
  assert.equal(b?.tone, 'strong')
  assert.equal(b?.label, 'Tested Aug 4')
  assert.equal(b?.detail, '10% off, no minimum')
})

test('chua thu tay -> lui ve ngay kiem link, KHONG duoc goi la "tested"', () => {
  const b = offerTrustBadge({ linkCheckedAt: '2026-08-03T06:48:00Z' })
  assert.equal(b?.tone, 'quiet')
  assert.equal(b?.label, 'Link checked Aug 3')
  assert.doesNotMatch(b!.label.toLowerCase(), /tested/)
  // Cau giai thich phai noi ro day khong phai thu ma o quay thanh toan
  assert.match(b!.title, /not a checkout test/i)
})

test('ma bi tu choi VAN hien — su thang than la thu phan biet trang song', () => {
  const b = offerTrustBadge({
    codeTestedAt: '2026-08-04T09:12:00Z',
    codeTestResult: 'rejected',
    codeTestNote: 'Checkout said the code has expired',
  })
  assert.equal(b?.tone, 'warn')
  assert.match(b!.label, /Didn't work on Aug 4/)
  assert.equal(b?.detail, 'Checkout said the code has expired')
})

test('da thu nhung khong ghi chu -> van hien ngay, chi thieu cau mo ta', () => {
  const b = offerTrustBadge({ codeTestedAt: '2026-08-04T09:12:00Z', codeTestResult: 'worked' })
  assert.equal(b?.label, 'Tested Aug 4')
  assert.equal(b?.detail, undefined)
})

test('ghi chu chi co khoang trang -> coi nhu khong co', () => {
  const b = offerTrustBadge({ codeTestedAt: '2026-08-04T09:12:00Z', codeTestNote: '   ' })
  assert.equal(b?.detail, undefined)
})

test('co ket qua nhung KHONG co ngay -> khong tinh la da thu', () => {
  // Mot ket qua khong ngay thang thi khong hon gi nhan "Verified" tran, nen no
  // phai lui ve du lieu cron chu khong duoc mao nhan la bang chung manh.
  const b = offerTrustBadge({ codeTestResult: 'worked', linkCheckedAt: '2026-08-03T06:48:00Z' })
  assert.equal(b?.tone, 'quiet')
  assert.equal(b?.label, 'Link checked Aug 3')
})

test('khong co du lieu nao -> khong hien nhan (khong bia)', () => {
  assert.equal(offerTrustBadge({}), null)
})

// ── Ngay thang doc theo UTC ──────────────────────────────────────
test('doc thang/ngay truc tiep tu chuoi ISO, khong qua mui gio may chay', () => {
  // Moc nay o UTC la 4/8, nhung o gio Viet Nam (+7) la 5/8. Neu dung
  // toLocaleDateString thi server (UTC) va trinh duyet khach ra hai ngay khac
  // nhau -> hydration mismatch, va hai nguoi doc thay hai ngay khac nhau.
  assert.equal(fmtDayUtc('2026-08-04T23:30:00Z'), 'Aug 4')
  assert.equal(fmtDayUtc('2026-01-01T00:00:00Z'), 'Jan 1')
  assert.equal(fmtDayUtc('2026-12-31T23:59:59Z'), 'Dec 31')
})

test('chuoi rac / rong -> null, khong nem loi', () => {
  assert.equal(fmtDayUtc(undefined), null)
  assert.equal(fmtDayUtc(''), null)
  assert.equal(fmtDayUtc('khong-phai-ngay'), null)
  assert.equal(fmtDayUtc('2026-13-01T00:00:00Z'), null)
})
