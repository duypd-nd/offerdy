/**
 * Tao tai khoan quan tri — `node scripts/create-admin.mjs`
 *
 * Vi sao phai co lenh nay: he thong moi khong co tai khoan nao, ma trang
 * `/admin/users` lai doi phai dang nhap bang mot tai khoan Chu. Do la mot canh
 * cua khoa tu ben trong. Lenh nay la chia khoa duy nhat mo no lan dau.
 *
 * Sau khi da co mot Chu, moi tai khoan tiep theo nen tao tren giao dien
 * `/admin/users` — o do co kiem tra quyen, con lenh nay thi khong.
 *
 * ⚠️ KHONG IN MAT KHAU ra man hinh hay ghi vao file nao.
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import { createHmac, scryptSync, randomBytes } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Doc .env.local: gia tri trong file la chuoi JSON hop le khi co dau nhay, nen
// JSON.parse tra ve dung chuoi that — khong phai tu viet phep doi "\n".
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

const need = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'SANITY_API_TOKEN', 'AUTH_PEPPER']
const missing = need.filter(k => !env[k])
if (missing.length) {
  bad(`Thieu bien moi truong: ${missing.join(', ')}`)
  console.log('\n  Dat chung trong .env.local roi chay lai.')
  console.log('  Sinh AUTH_SECRET / AUTH_PEPPER bang:')
  console.log('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"\n')
  process.exit(1)
}
ok('Da co du bien moi truong')

const PID = env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DS = 'admin'
const H = { Authorization: `Bearer ${env.SANITY_API_TOKEN}`, 'Content-Type': 'application/json' }

// Dataset rieng phai ton tai truoc — tao dataset can quyen project admin ma
// token robot khong co (do 2026-08-20: tra 401 missing grant
// sanity.project.datasets/create).
const probe = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent('count(*[])')}`, { headers: H })
if (!probe.ok) {
  bad(`Chua co dataset rieng "${DS}" (Sanity tra HTTP ${probe.status})`)
  console.log('\n  Tao no mot lan, bang MOT trong hai cach:')
  console.log(`    1. https://www.sanity.io/manage/project/${PID}/datasets -> Add dataset -> ten "admin" -> Private`)
  console.log('    2. npx sanity dataset create admin --visibility private\n')
  console.log('  ⚠️ Phai chon Private. De Public la ban bam mat khau nam cong khai.\n')
  process.exit(1)
}
ok(`Dataset rieng "${DS}" da san sang`)

// Canh bao neu dataset lo cau hinh thanh public
const anon = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent('count(*[])')}`)
if (anon.ok) {
  bad('⚠️ NGUY HIEM: dataset "admin" dang o che do PUBLIC — nguoi la doc duoc ban bam mat khau.')
  console.log(`  Doi sang Private tai https://www.sanity.io/manage/project/${PID}/datasets roi chay lai.\n`)
  process.exit(1)
}
ok('Dataset khong doc duoc tu ben ngoai (dung nhu mong doi)')

const rl = readline.createInterface({ input: stdin, output: stdout })
const email = (await rl.question('  Email      : ')).trim().toLowerCase()
const name = (await rl.question('  Ten hien thi: ')).trim()
const password = (await rl.question('  Mat khau (>= 12 ky tu): ')).trim()
rl.close()

if (!email.includes('@')) { bad('Email khong hop le'); process.exit(1) }
if (!name) { bad('Chua nhap ten'); process.exit(1) }
if (password.length < 12) { bad('Mat khau phai tu 12 ky tu tro len'); process.exit(1) }

const exists = await (await fetch(
  `https://${PID}.api.sanity.io/v2024-01-01/data/query/${DS}?query=${encodeURIComponent(`count(*[_type == "adminUser" && lower(email) == "${email}"])`)}`,
  { headers: H })).json()
if (exists.result > 0) { bad(`Da co tai khoan voi email ${email}`); process.exit(1) }

// Y HET src/lib/adminAuth.ts — doi mot ben la ben kia khong mo duoc
const SCRYPT_N = 32768, SCRYPT_r = 8, SCRYPT_p = 1, KEY_LEN = 64
const MAXMEM = 128 * SCRYPT_N * SCRYPT_r * 2
const salt = randomBytes(16)
const pepperedPw = createHmac('sha256', env.AUTH_PEPPER).update(password, 'utf8').digest()
const hash = scryptSync(pepperedPw, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: MAXMEM })
const passwordHash = `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('base64url')}$${hash.toString('base64url')}`

const res = await fetch(`https://${PID}.api.sanity.io/v2024-01-01/data/mutate/${DS}`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    mutations: [{ create: { _type: 'adminUser', email, name, role: 'owner', active: true, passwordHash, createdAt: new Date().toISOString() } }],
  }),
})
const body = await res.json()
if (!res.ok) { bad(`Khong tao duoc: ${JSON.stringify(body).slice(0, 220)}`); process.exit(1) }

ok(`Da tao tai khoan Chu: ${email}`)
console.log('\n  Vao /admin/login de dang nhap.')
console.log('  Cac tai khoan sau nen tao o /admin/users, khong dung lenh nay nua.\n')
