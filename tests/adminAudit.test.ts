/**
 * Nhat ky thao tac — phan thuan.
 *
 * Phan doc/ghi Sanity khong test o day (bo test cua du an nay co y khong mock).
 * Nhung hai thu duoi day thi phai dung: ngay theo gio VN, va chu hien ra man
 * hinh cho tung ma hanh dong.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditDay, actionLabel } from '../src/lib/adminAuditFormat'

// ── Ngay theo gio VN ───────────────────────────────────────────────
//
// ⚠️ Day la cho du an nay tung mat 7 tieng. Neu chia nhat ky theo ngay UTC thi
// moi thao tac tu 00:00 den 07:00 gio VN se roi vao tai lieu cua HOM QUA — mo
// nhat ky ra buoi sang se khong thay viec minh vua lam.

test('sau 17:00 UTC da la ngay hom sau o Viet Nam', () => {
  assert.equal(auditDay(new Date('2026-08-21T17:30:00Z')), '2026-08-22')
})

test('truoc 17:00 UTC van la ngay hom do', () => {
  assert.equal(auditDay(new Date('2026-08-21T16:59:00Z')), '2026-08-21')
})

test('nua dem gio VN = 17:00 UTC hom truoc', () => {
  // 00:30 gio VN ngay 22 — mot muc ghi luc nay phai thuoc ve ngay 22.
  assert.equal(auditDay(new Date('2026-08-21T17:00:00Z')), '2026-08-22')
})

test('dinh dang ngay sap xep duoc bang so sanh chuoi', () => {
  // `readAuditLog` loc bang `day >= $from` va `pruneAuditLog` bang `day < $cutoff`
  // — ca hai la so sanh CHUOI trong GROQ, nen dinh dang phai la YYYY-MM-DD.
  const days = ['2026-01-09', '2026-01-10', '2026-02-01', '2025-12-31']
  assert.deepEqual([...days].sort(), ['2025-12-31', '2026-01-09', '2026-01-10', '2026-02-01'])
  assert.match(auditDay(new Date('2026-01-05T03:00:00Z')), /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(auditDay(new Date('2026-02-01T03:00:00Z')) > auditDay(new Date('2026-01-31T03:00:00Z')))
})

// ── Chu hien ra man hinh ───────────────────────────────────────────
test('ma quen thuoc co chu tieng Viet', () => {
  assert.equal(actionLabel('user.role'), 'Đổi vai')
  assert.equal(actionLabel('offer.delete'), 'Xoá offer')
  assert.equal(actionLabel('login.fail'), 'Đăng nhập thất bại')
})

test('⚠️ ma LA phai hien ra chinh no, khong duoc thanh chuoi rong', () => {
  // Mot muc nhat ky khong doc duoc van la bang chung rang co viec gi do da xay
  // ra. Nuot no di la mat luon bang chung.
  assert.equal(actionLabel('thu.gi.do.moi'), 'thu.gi.do.moi')
  assert.equal(actionLabel(''), '')
})
