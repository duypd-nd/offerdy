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
import { catThoatAnToan } from './_vault.mjs'

// ⚠️ THAY CHO thoat(). Tren Windows + Node 24, goi thoat() SAU
// khi da fetch() lam Node sap voi UV_HANDLE_CLOSING va tra ma thoat 127 —
// thong bao loi van in ra nhung kem mot dong sap kho hieu, va moi thu doc ma
// thoat deu hieu sai. Xem chu thich o scripts/_vault.mjs.
const thoat = catThoatAnToan()

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
  thoat(1)
}

// ── 2. Dinh dang tung gia tri ────────────────────────────────────
// Bo dau nhay bao quanh — giong het `unquote()` trong src/lib/ga4.ts. Phai giong
// nhau, khong thi script bao "dat" ma production van hong (hoac nguoc lai).
const unquote = v => {
  const s = (v ?? '').trim()
  return s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))
    ? s.slice(1, -1)
    : s
}
const propertyId = unquote(env.GA4_PROPERTY_ID)
const clientEmail = unquote(env.GA4_CLIENT_EMAIL)
const privateKey = unquote(env.GA4_PRIVATE_KEY).replace(/\\n/g, '\n').trim()

if (/^G-/i.test(propertyId)) {
  bad(`GA4_PROPERTY_ID dang la "${propertyId}" — day la Measurement ID, khong phai Property ID`)
  hint('Property ID la mot day SO (vi du 412345678), xem o Admin → Property details')
  thoat(1)
}
if (!/^\d+$/.test(propertyId)) {
  bad(`GA4_PROPERTY_ID phai toan chu so, dang co "${propertyId}"`)
  thoat(1)
}
ok(`Property ID hop le: ${propertyId}`)

if (!clientEmail.includes('@') || !clientEmail.endsWith('.iam.gserviceaccount.com')) {
  bad(`GA4_CLIENT_EMAIL trong khong giong email service account: ${clientEmail}`)
  hint('Phai co dang <ten>@<du-an>.iam.gserviceaccount.com')
  thoat(1)
}
ok(`Client email hop le: ${clientEmail}`)

if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  bad('GA4_PRIVATE_KEY khong chua "-----BEGIN PRIVATE KEY-----"')
  hint('Dan nguyen truong "private_key" tu file JSON, ke ca dong BEGIN/END')
  thoat(1)
}
if (!privateKey.includes('\n')) {
  bad('GA4_PRIVATE_KEY chi co mot dong, khong co xuong dong nao')
  hint('Giu nguyen cac ky tu \\n trong chuoi — code se tu doi lai thanh xuong dong')
  thoat(1)
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
  thoat(1)
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
  thoat(1)
}
ok('Google cap access token')

/**
 * Cac property ma service account nay doc duoc, hoi qua Admin API.
 * Tra ve `null` khi khong hoi duoc (Admin API chua bat) — phan biet voi mang
 * rong, la cau tra loi "co hoi duoc, va cau tra loi la khong co property nao".
 */
async function listVisibleProperties(accessToken) {
  try {
    const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.accountSummaries ?? []).flatMap(a =>
      (a.propertySummaries ?? []).map(p => ({
        id: p.property.replace('properties/', ''),
        name: `${p.displayName} — tai khoan ${a.displayName}`,
      }))
    )
  } catch { return null }
}

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
    // 403 gop hai chuyen khac han nhau: CHUA cap quyen, va cap roi nhung dang hoi
    // NHAM property. Tu doan thi mat vai vong — con Admin API tra loi duoc ngay.
    //
    // Bay da mac phai that: nguoi dung dua so 399807673, do la **Account ID**
    // (accounts/399807673), con Property ID that la 543887586. Hai so nam sat nhau
    // trong giao dien GA4 va deu la day so 9 chu, khong cach nao phan biet bang mat.
    const props = await listVisibleProperties(tokenBody.access_token)
    if (props === null) {
      hint('Chua ro la chua cap quyen hay hoi nham property. Bat Admin API 1 phut de biet chac:')
      hint('https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com')
      hint(`Roi chay lai lenh nay.`)
    } else if (props.length === 0) {
      hint(`${clientEmail} chua duoc cap quyen o BAT KY property nao.`)
      hint('analytics.google.com → Admin → Property access management → + → Add users')
      hint('Nho BO TICK "Notify new users by email" — service account khong co hop thu.')
    } else {
      hint(`Quyen thi CO — nhung ${propertyId} khong nam trong so property doc duoc.`)
      hint(`Rat co the ${propertyId} la ACCOUNT ID chu khong phai Property ID.`)
      hint('Property ID dung la mot trong cac so duoi day:')
      for (const p of props) hint(`   GA4_PROPERTY_ID=${p.id}   (${p.name})`)
    }
  }
  if (reportRes.status === 403 && /disabled|not been used/i.test(msg)) {
    hint('Chua bat API: Google Cloud → APIs & Services → bat "Google Analytics Data API"')
  }
  if (reportRes.status === 404) hint(`Khong thay property ${propertyId} — kiem tra lai so nay`)
  thoat(1)
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
