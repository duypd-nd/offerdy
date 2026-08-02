/**
 * Kiem tra ket noi Google Analytics 4 tu dau den cuoi: `npm run check:ga4`
 *
 * Vi sao can mot lenh rieng thay vi cu mo /admin/reports ra xem: `getGa4Traffic`
 * CO Y nuot moi loi va tra ve `null` — mot o phu tren trang bao cao khong duoc
 * phep lam trang ca trang. Hay o giao dien, "chua cau hinh", "sai khoa rieng",
 * "quen cap quyen Viewer" va "go nham ID" nhin y het nhau. Cho nay thi khong:
 * moi buoc bao rieng, va bao dung cho hong.
 *
 * KHONG in gia tri that cua khoa rieng hay token — chi do dai va tien to.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createSign } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const hint = m => console.log(`      → ${m}`)

// Doc .env.local truc tiep: script nay chay ngoai Next nen khong co san process.env
function loadEnv() {
  const file = path.join(root, '.env.local')
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
console.log('\nKiem tra ket noi GA4\n')

// ── 1. Ba bien co mat khong ──────────────────────────────────────
let fail = false
for (const key of ['GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY']) {
  // `key in env` tach rieng voi `!!env[key]`: khoa co that nhung gia tri rong la
  // mot trang thai RIENG, va da tung ton vai vong chan doan voi CRON_SECRET.
  if (!(key in env)) { bad(`${key} — chua co trong .env.local`); fail = true }
  else if (!env[key]) { bad(`${key} — co khoa nhung gia tri RONG`); fail = true }
  else ok(`${key} — co (${env[key].length} ky tu)`)
}
if (fail) {
  console.log('\nCach lay ba gia tri nay:')
  hint('console.cloud.google.com → tao Service Account → Keys → Add key → JSON')
  hint('APIs & Services → bat "Google Analytics Data API"')
  hint('analytics.google.com → Admin → Property access → them email service account lam Viewer')
  hint('GA4_PROPERTY_ID la so o Admin → Property details (KHONG phai ma G-XXXXXXX)')
  hint('GA4_CLIENT_EMAIL = truong "client_email" trong file JSON')
  hint('GA4_PRIVATE_KEY = truong "private_key", dan nguyen ca chuoi \\n')
  process.exit(1)
}

// ── 2. Dinh dang tung gia tri ────────────────────────────────────
const propertyId = env.GA4_PROPERTY_ID.trim()
const clientEmail = env.GA4_CLIENT_EMAIL.trim()
const privateKey = env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n').trim()

if (/^G-/i.test(propertyId)) {
  bad(`GA4_PROPERTY_ID dang la "${propertyId}" — day la Measurement ID, khong phai Property ID`)
  hint('Property ID la mot day SO (vi du 412345678), xem o Admin → Property details')
  process.exit(1)
}
if (!/^\d+$/.test(propertyId)) {
  bad(`GA4_PROPERTY_ID phai toan chu so, dang co "${propertyId}"`)
  process.exit(1)
}
ok(`Property ID hop le: ${propertyId}`)

if (!clientEmail.includes('@') || !clientEmail.endsWith('.iam.gserviceaccount.com')) {
  bad(`GA4_CLIENT_EMAIL trong khong giong email service account: ${clientEmail}`)
  hint('Phai co dang <ten>@<du-an>.iam.gserviceaccount.com')
  process.exit(1)
}
ok(`Client email hop le: ${clientEmail}`)

if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  bad('GA4_PRIVATE_KEY khong chua "-----BEGIN PRIVATE KEY-----"')
  hint('Dan nguyen truong "private_key" tu file JSON, ke ca dong BEGIN/END')
  process.exit(1)
}
if (!privateKey.includes('\n')) {
  bad('GA4_PRIVATE_KEY chi co mot dong, khong co xuong dong nao')
  hint('Giu nguyen cac ky tu \\n trong chuoi — code se tu doi lai thanh xuong dong')
  process.exit(1)
}
ok('Khoa rieng dung dinh dang PEM')

// ── 3. Doi khoa lay access token ─────────────────────────────────
const b64url = i => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const iat = Math.floor(Date.now() / 1000)
const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
  iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600,
}))}`

let assertion
try {
  assertion = `${unsigned}.${b64url(createSign('RSA-SHA256').update(unsigned).sign(privateKey))}`
  ok('Ky JWT bang khoa rieng thanh cong')
} catch (e) {
  bad(`Khong ky duoc JWT: ${e.message}`)
  hint('Khoa rieng bi hong hoac cat mat mot phan khi dan')
  process.exit(1)
}

const tokenRes = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
})
const tokenBody = await tokenRes.json().catch(() => ({}))
if (!tokenRes.ok || !tokenBody.access_token) {
  bad(`Google tu choi cap token (HTTP ${tokenRes.status})`)
  hint(`Google noi: ${tokenBody.error ?? '?'} — ${tokenBody.error_description ?? 'khong ro'}`)
  if (tokenBody.error === 'invalid_grant') hint('Thuong la sai khoa rieng, hoac dong ho may lech nhieu')
  process.exit(1)
}
ok('Google cap access token')

// ── 4. Goi that Data API ─────────────────────────────────────────
const reportRes = await fetch(
  `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [
        { startDate: 'today', endDate: 'today' },
        { startDate: '6daysAgo', endDate: 'today' },
        { startDate: '29daysAgo', endDate: 'today' },
      ],
      metrics: [{ name: 'screenPageViews' }],
    }),
  }
)
const report = await reportRes.json().catch(() => ({}))
if (!reportRes.ok) {
  bad(`Data API tra loi ${reportRes.status}`)
  const msg = report?.error?.message ?? 'khong ro'
  hint(`Google noi: ${msg}`)
  if (reportRes.status === 403 && /permission|caller/i.test(msg)) {
    hint(`Thieu quyen: vao analytics.google.com → Admin → Property access management`)
    hint(`→ them ${clientEmail} voi vai tro Viewer`)
  }
  if (reportRes.status === 403 && /disabled|not been used/i.test(msg)) {
    hint('Chua bat API: Google Cloud → APIs & Services → bat "Google Analytics Data API"')
  }
  if (reportRes.status === 404) hint(`Khong thay property ${propertyId} — kiem tra lai so nay`)
  process.exit(1)
}
ok('Data API tra so lieu')

// ── 5. In so that ────────────────────────────────────────────────
const byRange = new Map()
for (const row of report.rows ?? []) {
  const name = row.dimensionValues?.[0]?.value
  if (name) byRange.set(name, Number(row.metricValues?.[0]?.value ?? 0))
}
console.log('\nLuot xem trang doc duoc:')
console.log(`  hom nay      ${byRange.get('date_range_0') ?? 0}`)
console.log(`  7 ngay qua   ${byRange.get('date_range_1') ?? 0}`)
console.log(`  30 ngay qua  ${byRange.get('date_range_2') ?? 0}`)
console.log('\n\x1b[32mXong — /admin/reports se hien khoi "Luot xem trang" thay cho huong dan cai dat.\x1b[0m')
console.log('Nho dat ba bien nay tren Vercel nua, khong chi o .env.local.\n')
