/**
 * Kiem tra ket noi Google Search Console tu dau den cuoi: `npm run check:gsc`
 *
 * Cung ly do ton tai voi `check-ga4.mjs`: `getSearchConsoleData` co y nuot moi
 * loi va tra ve `null`, nen tren giao dien "chua cau hinh", "chua cap quyen",
 * "sai GSC_SITE_URL" va "chua bat API" nhin y het nhau.
 *
 * Diem quan trong nhat: khi khong doc duoc, script LIET KE cac property ma
 * service account thuc su thay — vi `GSC_SITE_URL` co hai dang hop le khac han
 * nhau (`sc-domain:offerdy.com` cho xac minh theo ten mien, va
 * `https://www.offerdy.com/` cho xac minh theo tien to URL, ke ca dau `/` cuoi),
 * doan bang mat gan nhu chac chan sai.
 *
 * KHONG in gia tri khoa rieng — chi do dai.
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
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const hint = m => console.log(`      → ${m}`)

function loadEnv() {
  const file = path.join(root, '.env.local')
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return out
}
const unquote = v => {
  const s = (v ?? '').trim()
  return s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))
    ? s.slice(1, -1) : s
}

const env = { ...loadEnv(), ...process.env }
console.log('\nKiem tra ket noi Search Console\n')

// ── 1. Danh tinh Google (dung chung voi GA4) ─────────────────────
const clientEmail = unquote(env.GA4_CLIENT_EMAIL)
const privateKey = unquote(env.GA4_PRIVATE_KEY).replace(/\\n/g, '\n').trim()
if (!clientEmail || !privateKey) {
  bad('Chua co GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY')
  hint('Search Console dung CHUNG service account voi GA4. Chay `npm run check:ga4` truoc.')
  thoat(1)
}
ok(`Service account: ${clientEmail}`)

const b64 = i => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const iat = Math.floor(Date.now() / 1000)
const unsigned = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({
  iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600,
}))}`
let assertion
try {
  assertion = `${unsigned}.${b64(createSign('RSA-SHA256').update(unsigned).sign(privateKey))}`
} catch (e) {
  bad(`Khong ky duoc JWT: ${e.message}`)
  thoat(1)
}
const tokenRes = await fetch(TOKEN_URL, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
})
const tokenBody = await tokenRes.json().catch(() => ({}))
if (!tokenBody.access_token) {
  bad(`Google tu choi cap token: ${tokenBody.error_description ?? tokenBody.error ?? tokenRes.status}`)
  thoat(1)
}
ok('Google cap access token (pham vi webmasters.readonly)')

// ── 2. Service account thay duoc nhung site nao ──────────────────
const sitesRes = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
  headers: { Authorization: `Bearer ${tokenBody.access_token}` },
})
const sitesBody = await sitesRes.json().catch(() => ({}))
if (!sitesRes.ok) {
  bad(`Khong goi duoc Search Console API (HTTP ${sitesRes.status})`)
  const msg = sitesBody?.error?.message ?? ''
  hint(`Google noi: ${msg.slice(0, 200)}`)
  if (/has not been used|disabled/i.test(msg)) {
    hint('Chua bat API. Bat o day roi chay lai:')
    hint('https://console.cloud.google.com/apis/library/searchconsole.googleapis.com')
  }
  thoat(1)
}
const sites = (sitesBody.siteEntry ?? []).map(s => s.siteUrl)
ok('Search Console API tra loi')

if (!sites.length) {
  bad('Service account chua duoc cap quyen o BAT KY property nao')
  hint('search.google.com/search-console → chon property → Settings (Cai dat)')
  hint('→ Users and permissions → Add user')
  hint(`→ ${clientEmail}  ·  quyen Full hoac Restricted deu doc duoc`)
  thoat(1)
}
console.log('\n  Property doc duoc:')
for (const s of sites) console.log(`     ${s}`)

// ── 3. GSC_SITE_URL co khop khong ────────────────────────────────
const site = unquote(env.GSC_SITE_URL)
if (!site) {
  bad('Chua dat GSC_SITE_URL')
  hint('Dat dung MOT trong cac gia tri o tren, vi du:')
  for (const s of sites) hint(`   GSC_SITE_URL=${s}`)
  thoat(1)
}
if (!sites.includes(site)) {
  bad(`GSC_SITE_URL="${site}" khong nam trong danh sach tren`)
  hint('Phai khop TUNG KY TU — ke ca dau "/" o cuoi va tien to sc-domain:')
  for (const s of sites) hint(`   GSC_SITE_URL=${s}`)
  thoat(1)
}
ok(`GSC_SITE_URL khop: ${site}`)

// ── 4. Lay so lieu that ──────────────────────────────────────────
// Search Console cham 2-3 ngay so voi thoi gian thuc; xin "hom nay" luon rong.
const day = ms => new Date(Date.now() - ms * 86400000).toISOString().slice(0, 10)
const res = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: day(31), endDate: day(3), dimensions: [], rowLimit: 1 }),
  }
)
const body = await res.json().catch(() => ({}))
if (!res.ok) {
  bad(`Truy van so lieu that bai (HTTP ${res.status}): ${body?.error?.message?.slice(0, 180)}`)
  thoat(1)
}
ok('Doc duoc so lieu tim kiem')

const r = body.rows?.[0]
console.log(`\n28 ngay (den ${day(3)}, Search Console cham 3 ngay):`)
if (!r) {
  console.log('  Chua co du lieu nao — site chua xuat hien tren Google trong ky nay.')
} else {
  console.log(`  Luot bam       ${r.clicks ?? 0}`)
  console.log(`  Luot hien thi  ${r.impressions ?? 0}`)
  console.log(`  Ty le bam      ${((r.ctr ?? 0) * 100).toFixed(1)}%`)
  console.log(`  Vi tri TB      ${(r.position ?? 0).toFixed(1)}`)
}
console.log('\n\x1b[32mXong — /admin/search-console se hien so lieu.\x1b[0m')
console.log('Nho dat GSC_SITE_URL tren Vercel nua, khong chi o .env.local.\n')
