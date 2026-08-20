/**
 * Lop loi cua dang nhap admin. Day la file ma mot dong sai la thung ca he thong,
 * nen test o day nghieng han ve phia "thu KHONG duoc phep": chu ky gia, phien
 * het han, vai bi vuot quyen.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  hashPassword, verifyPassword,
  signSession, verifySession, SESSION_TTL_SECONDS,
  canAccess, isRole, ROLES, landingPath,
} from '../src/lib/adminAuth'
import { deriveKeys, encryptJson, decryptJson } from '../src/lib/adminCrypto'

const PEPPER = 'pepper-cho-test-khong-dung-that'
const SECRET = 'secret-cho-test-khong-dung-that'
const NOW = 1_770_000_000

// ── Bam mat khau ───────────────────────────────────────────────────
test('bam roi kiem lai dung mat khau', () => {
  const h = hashPassword('mật khẩu Tiếng Việt 123!', PEPPER)
  assert.equal(verifyPassword('mật khẩu Tiếng Việt 123!', h, PEPPER), true)
})

test('sai mat khau thi tu choi', () => {
  const h = hashPassword('dung', PEPPER)
  assert.equal(verifyPassword('sai', h, PEPPER), false)
  assert.equal(verifyPassword('', h, PEPPER), false)
  assert.equal(verifyPassword('dung ', h, PEPPER), false)
})

test('⚠️ SAI PEPPER thi khong mo duoc — day chinh la ly do pepper ton tai', () => {
  const h = hashPassword('dung', PEPPER)
  assert.equal(verifyPassword('dung', h, 'pepper-khac'), false)
  assert.equal(verifyPassword('dung', h, ''), false)
})

test('moi lan bam ra chuoi khac nhau (co salt ngau nhien)', () => {
  const a = hashPassword('x', PEPPER)
  const b = hashPassword('x', PEPPER)
  assert.notEqual(a, b, 'hai ban bam giong nhau nghia la salt khong ngau nhien')
  assert.equal(verifyPassword('x', a, PEPPER), true)
  assert.equal(verifyPassword('x', b, PEPPER), true)
})

test('tu choi bam khi khong co pepper, thay vi bam yeu', () => {
  assert.throws(() => hashPassword('x', ''), /AUTH_PEPPER/)
})

test('chuoi luu hong dinh dang thi tra false, khong nem loi', () => {
  for (const bad of ['', 'khong-phai-hash', 'scrypt$1$2$3', 'bcrypt$1$2$3$4$5', '$$$$$']) {
    assert.equal(verifyPassword('x', bad, PEPPER), false, `"${bad}" phai tra false`)
  }
})

// ── Phien ──────────────────────────────────────────────────────────
test('ky roi mo lai duoc phien hop le', () => {
  const t = signSession({ uid: 'u1', role: 'owner', exp: NOW + SESSION_TTL_SECONDS }, SECRET)
  const p = verifySession(t, SECRET, NOW)
  assert.deepEqual(p, { uid: 'u1', role: 'owner', exp: NOW + SESSION_TTL_SECONDS })
})

test('⚠️ doi mot ky tu trong phan than la chu ky hong', () => {
  const t = signSession({ uid: 'u1', role: 'viewer', exp: NOW + 100 }, SECRET)
  const [body, sig] = t.split('.')
  // Doi vai `viewer` -> `owner` roi ky lai bang than da sua nhung giu chu ky cu
  const gia = Buffer.from(JSON.stringify({ uid: 'u1', role: 'owner', exp: NOW + 100 })).toString('base64url')
  assert.equal(verifySession(`${gia}.${sig}`, SECRET, NOW), null, 'nang quyen bang cach sua than PHAI bi chan')
  assert.notEqual(body, gia)
})

test('sai khoa bi mat thi tu choi', () => {
  const t = signSession({ uid: 'u1', role: 'owner', exp: NOW + 100 }, SECRET)
  assert.equal(verifySession(t, 'khoa-khac', NOW), null)
  assert.equal(verifySession(t, '', NOW), null)
})

test('het han thi tu choi, ke ca khi chu ky dung', () => {
  const t = signSession({ uid: 'u1', role: 'owner', exp: NOW - 1 }, SECRET)
  assert.equal(verifySession(t, SECRET, NOW), null)
})

test('dinh dang rac thi tra null, khong nem loi', () => {
  for (const bad of [undefined, '', 'khong-co-dau-cham', '.', 'a.b.c.d', 'e30.saichuky']) {
    assert.equal(verifySession(bad as string | undefined, SECRET, NOW), null)
  }
})

test('vai khong hop le trong than thi tu choi', () => {
  // Ky that bang khoa that, nhung vai la chuoi la
  const body = Buffer.from(JSON.stringify({ uid: 'u1', role: 'superadmin', exp: NOW + 100 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
  assert.equal(verifySession(`${body}.${sig}`, SECRET, NOW), null)
})

test('thieu uid thi tu choi', () => {
  const body = Buffer.from(JSON.stringify({ role: 'owner', exp: NOW + 100 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
  assert.equal(verifySession(`${body}.${sig}`, SECRET, NOW), null)
})

// ── Phan quyen ─────────────────────────────────────────────────────
test('chu vao duoc moi noi, ke ca POST', () => {
  for (const p of ['/admin', '/admin/users', '/admin/config/seo', '/admin/offers', '/admin/migrate/deal-codes']) {
    assert.equal(canAccess('owner', p, 'GET'), true, p)
    assert.equal(canAccess('owner', p, 'POST'), true, p)
  }
})

test('bien tap sua duoc noi dung nhung KHONG dung vao nguoi dung va cau hinh', () => {
  assert.equal(canAccess('editor', '/admin/offers', 'POST'), true)
  assert.equal(canAccess('editor', '/admin/deals', 'POST'), true)
  assert.equal(canAccess('editor', '/admin/import', 'POST'), true)
  assert.equal(canAccess('editor', '/admin/users', 'GET'), false)
  assert.equal(canAccess('editor', '/admin/config', 'GET'), false)
  assert.equal(canAccess('editor', '/admin/config/seo', 'POST'), false)
  assert.equal(canAccess('editor', '/admin/migrate/deal-codes', 'POST'), false)
})

test('⚠️ chi-xem KHONG POST duoc o bat ky dau — ke ca trang no xem duoc', () => {
  // Server Action luon la POST ve chinh duong dan trang, nen day la vong chan
  // that su cua vai chi-xem, khong phai chuyen giao dien.
  for (const p of ['/admin', '/admin/reports', '/admin/ad-planner', '/admin/offers']) {
    assert.equal(canAccess('viewer', p, 'POST'), false, p)
  }
})

test('chi-xem doc duoc bao cao, khong doc duoc trang sua noi dung', () => {
  assert.equal(canAccess('viewer', '/admin/reports', 'GET'), true)
  assert.equal(canAccess('viewer', '/admin/search-console', 'GET'), true)
  assert.equal(canAccess('viewer', '/admin', 'GET'), true)
  assert.equal(canAccess('viewer', '/admin/offers', 'GET'), false)
  assert.equal(canAccess('viewer', '/admin/users', 'GET'), false)
})

test('⚠️ trang admin MOI mac dinh dong voi chi-xem (allowlist, khong phai danh sach cam)', () => {
  assert.equal(canAccess('viewer', '/admin/mot-trang-chua-ton-tai', 'GET'), false)
  // con bien tap thi mac dinh MO — dung chu dich: ho lam noi dung
  assert.equal(canAccess('editor', '/admin/mot-trang-chua-ton-tai', 'GET'), true)
})

test('duong dan con khong lach duoc vong chan', () => {
  assert.equal(canAccess('editor', '/admin/users/moi', 'GET'), false)
  assert.equal(canAccess('editor', '/admin/config/author', 'GET'), false)
  // nhung ten chi BAT DAU giong thi khong bi chan oan
  assert.equal(canAccess('editor', '/admin/users-khac', 'GET'), true)
})

test('isRole chi nhan dung ba vai', () => {
  for (const r of ROLES) assert.equal(isRole(r), true)
  for (const bad of ['admin', 'root', '', null, undefined, 1]) assert.equal(isRole(bad), false)
})

test('chi-xem duoc dua thang toi bao cao sau khi dang nhap', () => {
  assert.equal(landingPath('viewer'), '/admin/reports')
  assert.equal(landingPath('owner'), '/admin')
  assert.equal(landingPath('editor'), '/admin')
})

// ── Ma hoa kho tai khoan ───────────────────────────────────────────
//
// Kho nam trong dataset CONG KHAI cua Sanity (dataset rieng tu la tinh nang tra
// phi, goi hien tai khong co). Nen phep ma hoa nay la thu duy nhat dung giua
// danh sach quan tri vien va bat ky ai tren internet.

test('ma hoa roi giai ma lai ra dung du lieu', () => {
  const { encKey } = deriveKeys('khoa-chu-test')
  const users = [{ id: 'a', email: 'a@x.com', role: 'owner', passwordHash: 'scrypt$...' }]
  assert.deepEqual(decryptJson(encryptJson(users, encKey), encKey), users)
})

test('⚠️ SAI KHOA thi khong giai ma duoc — day la ca ly do kho ton tai', () => {
  const a = deriveKeys('khoa-mot').encKey
  const b = deriveKeys('khoa-hai').encKey
  assert.equal(decryptJson(encryptJson({ bi: 'mat' }, a), b), null)
})

test('⚠️ SUA MOT KY TU trong ban ma la giai ma that bai (GCM co the xac thuc)', () => {
  const { encKey } = deriveKeys('khoa-chu-test')
  const enc = encryptJson([{ role: 'viewer' }], encKey)
  const parts = enc.split('.')
  // Doi mot ky tu trong phan than
  const body = parts[3]
  const sua = (body[0] === 'A' ? 'B' : 'A') + body.slice(1)
  assert.equal(decryptJson([parts[0], parts[1], parts[2], sua].join('.'), encKey), null,
    'khong co the xac thuc thi ke tan cong co the sua ban ghi de tu nang len vai Chu')
})

test('dinh dang rac thi tra null, khong nem loi', () => {
  const { encKey } = deriveKeys('khoa-chu-test')
  for (const bad of [undefined, '', 'khong-phai', 'v1.a.b', 'v2.a.b.c', 'v1....']) {
    assert.equal(decryptJson(bad, encKey), null, `"${bad}"`)
  }
})

test('moi lan ma hoa ra chuoi khac nhau (IV ngau nhien)', () => {
  const { encKey } = deriveKeys('khoa-chu-test')
  const a = encryptJson({ x: 1 }, encKey)
  const b = encryptJson({ x: 1 }, encKey)
  assert.notEqual(a, b, 'IV lap lai la mot loi nghiem trong voi AES-GCM')
})

test('⚠️ pepper va khoa ma hoa la HAI khoa khac nhau tu cung mot khoa chu', () => {
  const k = deriveKeys('khoa-chu-test')
  // Dung chung mot khoa cho hai viec la thu nen tranh; HKDF voi hai nhan `info`
  // khac nhau cho hai khoa doc lap ve mat mat ma.
  assert.notEqual(k.pepper, k.encKey.toString('base64url'))
  assert.equal(k.encKey.length, 32)
})

test('khoa chu khac nhau -> pepper khac nhau', () => {
  assert.notEqual(deriveKeys('mot').pepper, deriveKeys('hai').pepper)
})

test('tu choi dan xuat khi khong co khoa chu', () => {
  assert.throws(() => deriveKeys(''), /AUTH_PEPPER/)
})
