/**
 * Sao luu kho tai khoan quan tri.
 *
 * File nay nghieng han ve phia "thu PHAI TU CHOI". Mot ban sao luu chi co gia
 * tri khi no tu choi dung luc: tu choi ghi kho rong de len ban sao tot, tu choi
 * mo bang sai khoa, tu choi dung mot khoa trung voi khoa cua ban goc. Mot ban
 * sao "de tinh" thi chay tron tru va vo dung dung luc can den.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveKeys, deriveBackupKey, MIN_BACKUP_KEY_LENGTH } from '../src/lib/adminCrypto'
import {
  buildBackup, sealBackup, openBackup, verifyBackup, describeBackup,
  BACKUP_FORMAT, type BackupPayload,
} from '../src/lib/adminBackup'
import type { StoredUser } from '../src/lib/adminVault'

const PEPPER = 'pepper-cho-test-khong-dung-that-0123456789'
const BACKUP_KEY = 'khoa-sao-luu-cho-test-khong-dung-that-9876543210'
const SECRET = 'secret-cho-test-khong-dung-that'
const NOW = new Date('2026-08-21T01:00:00.000Z')

const USERS: StoredUser[] = [
  { id: 'u1', email: 'chu@offerdy.com', name: 'Chu', role: 'owner', active: true, passwordHash: 'scrypt$32768$8$1$aaa$bbb', createdAt: '2026-08-20T00:00:00.000Z' },
  { id: 'u2', email: 'xem@offerdy.com', name: 'Xem', role: 'viewer', active: false, passwordHash: 'scrypt$32768$8$1$ccc$ddd', createdAt: '2026-08-20T00:00:00.000Z' },
]

function key(master = BACKUP_KEY): Buffer {
  const k = deriveBackupKey(master, PEPPER)
  if (!k.ok) throw new Error(k.error)
  return k.key
}

function built(): BackupPayload {
  const b = buildBackup({ users: USERS, authPepper: PEPPER, authSecret: SECRET, source: 'cli', now: NOW })
  if (!b.ok) throw new Error(b.error)
  return b.payload
}

const errOf = (r: { ok: false; error: string } | { ok: true }): string => (r.ok ? '' : r.error)

// ── Khoa ban sao ───────────────────────────────────────────────────
test('khoa ban sao trung AUTH_PEPPER thi TU CHOI', () => {
  // Vong chan quan trong nhat ca file: hai khoa bang nhau nghia la khong sao luu
  // gi ca, chi nhan doi cung mot diem chet — va no im lang tuyet doi.
  const r = deriveBackupKey(PEPPER, PEPPER)
  assert.equal(r.ok, false)
  assert.match(errOf(r), /trùng AUTH_PEPPER/)
})

test('khoa ban sao trung ke ca khi thua khoang trang', () => {
  // Dan gia tri qua o nhap cua Vercel rat de dinh khoang trang o cuoi — va do la
  // loi khong nhin thay bang mat.
  assert.equal(deriveBackupKey(` ${PEPPER} `, PEPPER).ok, false)
})

test('khoa ban sao qua ngan thi tu choi', () => {
  assert.equal(deriveBackupKey('a'.repeat(MIN_BACKUP_KEY_LENGTH - 1), PEPPER).ok, false)
  assert.equal(deriveBackupKey('a'.repeat(MIN_BACKUP_KEY_LENGTH), PEPPER).ok, true)
})

test('thieu khoa ban sao thi tu choi', () => {
  assert.equal(deriveBackupKey(undefined, PEPPER).ok, false)
  assert.equal(deriveBackupKey('', PEPPER).ok, false)
})

test('khoa ban sao doc lap voi khoa ma hoa kho', () => {
  // Neu hai khoa nay bang nhau thi HKDF dang bi dung sai va ban sao khong con
  // doc lap voi ban goc nua.
  assert.notEqual(key().toString('hex'), deriveKeys(PEPPER).encKey.toString('hex'))
})

// ── Dong goi ───────────────────────────────────────────────────────
test('ban sao chua CHINH AUTH_PEPPER', () => {
  // Khong co no, khoi phuc xong se ra mot danh sach tai khoan ma khong ai dang
  // nhap duoc: ban bam da tron pepper cu.
  const p = built()
  assert.equal(p.authPepper, PEPPER)
  assert.equal(p.authSecret, SECRET)
  assert.equal(p.format, BACKUP_FORMAT)
  assert.equal(p.createdAt, NOW.toISOString())
})

test('kho RONG thi tu choi dong goi', () => {
  const r = buildBackup({ users: [], authPepper: PEPPER, authSecret: SECRET, source: 'cron', now: NOW })
  assert.equal(r.ok, false)
  assert.match(errOf(r), /rỗng/)
})

test('thieu AUTH_PEPPER thi tu choi dong goi', () => {
  assert.equal(buildBackup({ users: USERS, authPepper: undefined, authSecret: SECRET, source: 'cron', now: NOW }).ok, false)
})

test('thieu AUTH_SECRET van sao luu duoc', () => {
  // Mat AUTH_SECRET chi lam moi nguoi bi dang xuat. Khong duoc chan ca ban sao
  // vi mot thu it nghiem trong hon han.
  const r = buildBackup({ users: USERS, authPepper: PEPPER, authSecret: undefined, source: 'cron', now: NOW })
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.payload.authSecret, null)
})

// ── Niem phong va mo lai ───────────────────────────────────────────
test('niem phong roi mo lai duoc nguyen ven', () => {
  const p = built()
  const opened = openBackup(sealBackup(p, key()), key())
  assert.equal(opened.ok, true)
  if (opened.ok) assert.deepEqual(opened.payload, p)
})

test('SAI khoa thi khong mo duoc', () => {
  const opened = openBackup(sealBackup(built(), key()), key('mot-khoa-hoan-toan-khac-de-test-1234567890'))
  assert.equal(opened.ok, false)
  assert.match(errOf(opened), /AUTH_BACKUP_KEY/)
})

test('sua mot ky tu trong ban sao thi khong mo duoc', () => {
  // AES-GCM tu phat hien noi dung bi doi. Neu cho nay lot, ai do co the sua ban
  // sao de tu nang minh len vai Chu roi cho ngay khoi phuc.
  const blob = sealBackup(built(), key())
  const broken = blob.slice(0, -3) + (blob.endsWith('A') ? 'BBB' : 'AAA')
  assert.equal(openBackup(broken, key()).ok, false)
})

test('ban sao rong hoac sai dinh dang thi tu choi', () => {
  assert.equal(openBackup(undefined, key()).ok, false)
  assert.equal(openBackup('', key()).ok, false)
  assert.equal(openBackup('khong-phai-dinh-dang', key()).ok, false)
})

test('khong phai ban sao kho tai khoan thi noi ro', () => {
  const notMine = sealBackup({ format: 'thu-khac', version: 1 } as unknown as BackupPayload, key())
  const r = openBackup(notMine, key())
  assert.equal(r.ok, false)
  assert.match(errOf(r), /Không phải bản sao/)
})

test('ban sao phien ban MOI HON thi tu choi, khong doc bua', () => {
  // Doc bua roi ghi lai la lam mat nhung truong ma code cu khong hieu.
  const r = openBackup(sealBackup({ ...built(), version: 99 }, key()), key())
  assert.equal(r.ok, false)
  assert.match(errOf(r), /phiên bản 99/)
})

test('ban sao khong co tai khoan nao thi tu choi', () => {
  assert.equal(openBackup(sealBackup({ ...built(), users: [] }, key()), key()).ok, false)
})

test('ban sao thieu pepper thi tu choi', () => {
  const r = openBackup(sealBackup({ ...built(), authPepper: '' }, key()), key())
  assert.equal(r.ok, false)
  assert.match(errOf(r), /AUTH_PEPPER/)
})

// ── Kiem chung sau khi niem phong ──────────────────────────────────
test('kiem chung dat khi ban sao dung', () => {
  const p = built()
  assert.equal(verifyBackup(sealBackup(p, key()), key(), p).ok, true)
})

test('kiem chung bat duoc truong hop thieu tai khoan', () => {
  const p = built()
  const r = verifyBackup(sealBackup({ ...p, users: [USERS[0]] }, key()), key(), p)
  assert.equal(r.ok, false)
  assert.match(errOf(r), /1 tài khoản/)
})

test('kiem chung bat duoc truong hop doi tai khoan ma giu nguyen so luong', () => {
  // Cung so luong nhung khac nguoi — dem so thoi thi lot.
  const p = built()
  const doi = [USERS[0], { ...USERS[1], id: 'u3-la-mat' }]
  const r = verifyBackup(sealBackup({ ...p, users: doi }, key()), key(), p)
  assert.equal(r.ok, false)
  assert.match(errOf(r), /thiếu 1 tài khoản/)
})

test('kiem chung bat duoc truong hop pepper khac', () => {
  const p = built()
  const r = verifyBackup(sealBackup({ ...p, authPepper: 'pepper-khac' }, key()), key(), p)
  assert.equal(r.ok, false)
  assert.match(errOf(r), /AUTH_PEPPER khác/)
})

// ── Mo ta ──────────────────────────────────────────────────────────
test('mo ta ban sao KHONG lo bi mat', () => {
  // Dong mo ta duoc in ra man hinh truoc khi ghi de, va co the bi chup man hinh
  // hoac dan vao cho khac. Pepper va ban bam tuyet doi khong duoc co mat.
  const text = describeBackup(built()).join('\n')
  assert.ok(!text.includes(PEPPER), 'mo ta lo AUTH_PEPPER')
  assert.ok(!text.includes(SECRET), 'mo ta lo AUTH_SECRET')
  assert.ok(!text.includes('scrypt$'), 'mo ta lo ban bam mat khau')
  assert.match(text, /chu@offerdy\.com/)
  assert.match(text, /đã vô hiệu hoá/)
})
