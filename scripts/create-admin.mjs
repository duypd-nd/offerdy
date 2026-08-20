/**
 * Tao tai khoan quan tri — `node scripts/create-admin.mjs`
 *
 * Vi sao phai co lenh nay: he thong moi khong co tai khoan nao, ma trang
 * `/admin/users` lai doi phai dang nhap bang mot tai khoan Chu. Do la mot canh
 * cua khoa tu ben trong. Lenh nay la chia khoa duy nhat mo no lan dau.
 *
 * Sau khi da co mot Chu, moi tai khoan tiep theo nen tao tren `/admin/users` —
 * o do co kiem tra quyen, con lenh nay thi khong.
 *
 * ⚠️ Thuat toan o day phai KHOP TUNG BIT voi src/lib/adminCrypto.ts va
 * src/lib/adminAuth.ts. Doi mot ben ma quen ben kia la kho khong mo duoc nua.
 *
 * ⚠️ KHONG IN MAT KHAU ra man hinh hay ghi vao file nao.
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import { createHmac, scryptSync, randomBytes, randomUUID, hkdfSync, createCipheriv, createDecipheriv } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const file = path.join(root, '.env.local')
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    const raw = line.slice(i + 1).trim()
    let val = raw
    if (raw.startsWith('"')) { try { val = JSON.parse(raw) } catch { val = raw.slice(1, -1) } }
    else if (raw.startsWith("'")) val = raw.slice(1, -1)
    out[key] = val
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)

console.log('\nTao tai khoan quan tri Offerdy\n')

const need = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_TOKEN', 'AUTH_PEPPER']
const missing = need.filter(k => !env[k])
if (missing.length) {
  bad(`Thieu bien moi truong: ${missing.join(', ')}`)
  console.log('\n  Sinh AUTH_SECRET / AUTH_PEPPER bang:')
  console.log('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"\n')
  process.exit(1)
}
ok('Da co du bien moi truong')

const PID = env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DS = env.NEXT_PUBLIC_SANITY_DATASET
const H = { Authorization: `Bearer ${env.SANITY_API_TOKEN}`, 'Content-Type': 'application/json' }
const DOC_ID = 'adminVault'

// ── Y HET src/lib/adminCrypto.ts ──────────────────────────────────
const SALT = 'offerdy-admin-v1'
const pepper = Buffer.from(hkdfSync('sha256', env.AUTH_PEPPER, SALT, 'password-pepper', 32)).toString('base64url')
const encKey = Buffer.from(hkdfSync('sha256', env.AUTH_PEPPER, SALT, 'vault-encryption', 32))

const encryptJson = value => {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', encKey, iv)
  const body = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), body.toString('base64url')].join('.')
}
const decryptJson = payload => {
  if (!payload) return null
  const p = payload.split('.')
  if (p.length !== 4 || p[0] !== 'v1') return null
  try {
    const d = createDecipheriv('aes-256-gcm', encKey, Buffer.from(p[1], 'base64url'))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8'))
  } catch { return null }
}

// ── Y HET src/lib/adminAuth.ts ────────────────────────────────────
const SCRYPT_N = 32768, SCRYPT_r = 8, SCRYPT_p = 1, KEY_LEN = 64
const MAXMEM = 128 * SCRYPT_N * SCRYPT_r * 2
const hashPassword = pw => {
  const salt = randomBytes(16)
  const h = scryptSync(createHmac('sha256', pepper).update(pw, 'utf8').digest(), salt, KEY_LEN,
    { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: MAXMEM })
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('base64url')}$${h.toString('base64url')}`
}

// ── Doc kho hien co ───────────────────────────────────────────────
const q = `*[_id == "${DOC_ID}"][0]{ data, _rev }`
const res = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent(q)}`, { headers: H })
if (!res.ok) { bad(`Khong doc duoc Sanity (HTTP ${res.status})`); process.exit(1) }
const doc = (await res.json()).result

let users = []
let rev = null
if (doc) {
  rev = doc._rev ?? null
  const decoded = decryptJson(doc.data)
  if (decoded === null) {
    // ⚠️ Ghi de len kho khong giai ma duoc = XOA VINH VIEN moi tai khoan, chi vi
    // mot bien moi truong dat nham. Dung lai, khong doan.
    bad('Kho tai khoan da ton tai nhung KHONG GIAI MA DUOC.')
    console.log('\n  Gan nhu chac chan la AUTH_PEPPER khac voi luc tao kho.')
    console.log('  Dat lai dung gia tri cu roi chay lai. KHONG ghi de — lam vay la mat sach tai khoan.\n')
    process.exit(1)
  }
  users = decoded
  ok(`Kho hien co ${users.length} tai khoan`)
} else {
  ok('Chua co kho — se tao moi')
}

// Lenh nay hoi mat khau nen bat buoc phai co ban phim that. Khong co TTY thi
// readline doc EOF va Node bao "unsettled top-level await" — mot thong bao
// khong lien quan gi den nguyen nhan.
if (!stdin.isTTY) {
  bad('Lenh nay can chay truc tiep trong terminal (co ban phim).')
  console.log('\n  Dung `node scripts/create-admin.mjs`, khong dan qua ong dan hay chay trong CI.\n')
  process.exit(1)
}

// ⚠️ Ban sao cua MIN_PASSWORD_LENGTH trong src/lib/adminAuth.ts. File .mjs
// khong import duoc hang tu TypeScript, nen doi mot ben phai doi ca ben kia.
const MIN_PASSWORD_LENGTH = 10

const rl = readline.createInterface({ input: stdin, output: stdout })
const email = (await rl.question('  Email        : ')).trim().toLowerCase()
const name = (await rl.question('  Ten hien thi : ')).trim()
const password = (await rl.question(`  Mat khau (>= ${MIN_PASSWORD_LENGTH} ky tu): `)).trim()
rl.close()

if (!email.includes('@')) { bad('Email khong hop le'); process.exit(1) }
if (!name) { bad('Chua nhap ten'); process.exit(1) }
if (password.length < MIN_PASSWORD_LENGTH) { bad(`Mat khau phai tu ${MIN_PASSWORD_LENGTH} ky tu tro len`); process.exit(1) }
if (users.some(u => u.email.toLowerCase() === email)) { bad(`Da co tai khoan voi email ${email}`); process.exit(1) }

users.push({
  id: randomUUID(), email, name, role: 'owner', active: true,
  passwordHash: hashPassword(password), createdAt: new Date().toISOString(),
})

const data = encryptJson(users)
const mutations = rev
  ? [{ patch: { id: DOC_ID, ifRevisionID: rev, set: { data } } }]
  : [{ createOrReplace: { _id: DOC_ID, _type: 'adminVault', data } }]

const w = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/mutate/${DS}`, {
  method: 'POST', headers: H, body: JSON.stringify({ mutations }),
})
if (!w.ok) { bad(`Khong luu duoc: ${JSON.stringify(await w.json()).slice(0, 220)}`); process.exit(1) }

ok(`Da tao tai khoan Chu: ${email}`)
console.log('\n  Vao /admin/login de dang nhap.')
console.log('  Cac tai khoan sau nen tao o /admin/users, khong dung lenh nay nua.\n')
console.log('  ⚠️ Tai lieu "adminVault" nam trong dataset CONG KHAI nhung noi dung da ma hoa.')
console.log('     Nguoi la tai duoc no nhung chi thay chuoi rac. Dung bao gio doi AUTH_PEPPER')
console.log('     neu khong muon mat het tai khoan.\n')
