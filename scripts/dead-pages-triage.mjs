/**
 * Phan loai cac URL Google dang xep hang nhung tra ve 404: `npm run triage:dead`
 *
 * Vi sao can, khi `/admin/search-console` da co the "Google van xep hang N trang
 * da chet": the do CHAN DOAN, con day la de RA QUYET DINH. Ba khac biet:
 *
 *   1. `findDeadPages` chi kiem 40 trang nhieu hien thi nhat — co y, vi no chay
 *      trong moi luot xem trang admin. O day chay tay nen kiem HET.
 *   2. No khong biet du lieu hien tai con gi. Mot URL `/stores/x` chet trong khi
 *      store "X" van nam trong Sanity duoi slug khac la mot lop LOI HOAN TOAN
 *      KHAC (doi slug -> phai 301), khong phai "da xoa co chu dinh".
 *   3. Ket qua o day la mot bang de nguoi van hanh quyet dinh tung dong.
 *
 * ⚠️ Script KHONG tu sua gi ca. Xoa hay giu la quyet dinh kinh doanh — no chi
 * bay ra bang chung. Ba nhom no phan:
 *
 *   [301]     Con thuc the rat giong trong Sanity  -> gan nhu chac chan doi slug
 *   [DUNG_LAI] Khong con gi khop, nhung URL con thu hang/hien thi that
 *   [GIU_404]  Khong con gi khop va cung khong con gia tri tim kiem
 *
 * Vi sao "doi slug" phai tach rieng: 301 sang dung trang la thu lai duoc thu
 * hang; con 404 mot trang van ton tai duoi ten khac la tu vut di. Nhung 301
 * sang mot trang KHONG tuong duong thi Google coi la soft-404 va mat luon —
 * nen script chi de xuat 301 khi do khop du cao, phan con lai de nguoi doc.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createSign } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from 'next-sanity'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

// Cua so rong hon `searchConsole.ts` (28 ngay) co chu dinh: mot trang chet
// thang truoc van la thu hang vua mat, va no chi hien ra khi nhin du xa.
const WINDOW_DAYS = 90
const LAG_DAYS = 3
const BATCH = 8

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' }

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

// ── 1. Token Google ──────────────────────────────────────────────
const clientEmail = unquote(env.GA4_CLIENT_EMAIL)
const privateKey = unquote(env.GA4_PRIVATE_KEY).replace(/\\n/g, '\n').trim()
const site = unquote(env.GSC_SITE_URL)
if (!clientEmail || !privateKey || !site) {
  console.error('Thieu GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY / GSC_SITE_URL. Chay `npm run check:gsc` truoc.')
  process.exit(1)
}
const b64 = i => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const iat = Math.floor(Date.now() / 1000)
const unsigned = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({
  iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600,
}))}`
const assertion = `${unsigned}.${b64(createSign('RSA-SHA256').update(unsigned).sign(privateKey))}`
const tokenBody = await (await fetch(TOKEN_URL, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
})).json()
if (!tokenBody.access_token) {
  console.error('Google tu choi cap token:', tokenBody.error_description ?? tokenBody.error)
  process.exit(1)
}

// ── 2. Moi URL Google tung hien thi trong cua so ─────────────────
const end = new Date(Date.now() - LAG_DAYS * 86400000)
const start = new Date(end.getTime() - WINDOW_DAYS * 86400000)
const iso = d => d.toISOString().slice(0, 10)
const res = await fetch(
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 1000 }),
  },
)
if (!res.ok) {
  console.error(`Search Console tra HTTP ${res.status}:`, (await res.text()).slice(0, 300))
  process.exit(1)
}
const pages = ((await res.json()).rows ?? []).map(r => ({
  url: r.keys[0], clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, position: r.position ?? 0,
}))
console.log(`\n${c.b}Cua so ${iso(start)} → ${iso(end)} (${WINDOW_DAYS} ngay)${c.x}`)
console.log(`Google hien thi ${c.b}${pages.length}${c.x} URL cua site.\n`)

// ── 3. URL nao con song ──────────────────────────────────────────
process.stdout.write('Dang kiem tung URL')
const dead = []
for (let i = 0; i < pages.length; i += BATCH) {
  await Promise.all(pages.slice(i, i + BATCH).map(async p => {
    try {
      const r = await fetch(p.url, { method: 'HEAD', redirect: 'manual' })
      if (r.status >= 400) dead.push({ ...p, status: r.status })
    } catch { /* loi mang -> coi nhu con song; bo sot con hon bao dong gia */ }
  }))
  process.stdout.write('.')
}
console.log(` xong.\n`)

// ── 4. Du lieu con song trong Sanity ─────────────────────────────
const sanity = createClient({
  projectId: unquote(env.NEXT_PUBLIC_SANITY_PROJECT_ID),
  dataset: unquote(env.NEXT_PUBLIC_SANITY_DATASET) || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})
const live = await sanity.fetch(`{
  "stores":  *[_type=="store"]{ "slug": slug.current, name },
  "reviews": *[_type=="review"]{ "slug": slug.current, title },
  "deals":   *[_type=="deal"]{ "slug": slug.current, title },
  "posts":   *[_type=="post"]{ "slug": slug.current, title }
}`)

// So khop theo TU, khong theo chuoi con: "pollo" nam trong "apollo moda" — chinh
// cai bay do da tung lam trang 404 goi y sai shop (xem matchesKeyword trong
// src/lib/fuzzy.ts). O day dung he so Jaccard tren tap tu, va nguong dat cao vi
// mot de xuat 301 sai dat hon la khong de xuat gi.
const words = s => new Set(String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2))
function bestMatch(slug, rows, key) {
  const a = words(slug)
  if (!a.size) return null
  let best = null
  for (const row of rows) {
    for (const cand of [row.slug, row[key]]) {
      const b = words(cand)
      if (!b.size) continue
      const inter = [...a].filter(w => b.has(w)).length
      const score = inter / new Set([...a, ...b]).size
      if (!best || score > best.score) best = { score, slug: row.slug, label: row[key] }
    }
  }
  return best
}

const TYPES = {
  stores:  { rows: live.stores,  key: 'name',  label: 'store'  },
  reviews: { rows: live.reviews, key: 'title', label: 'review' },
  deals:   { rows: live.deals,   key: 'title', label: 'deal'   },
  blog:    { rows: live.posts,   key: 'title', label: 'bai viet' },
}

const rows = dead.map(d => {
  const p = new URL(d.url).pathname.replace(/\/$/, '')
  const seg = p.split('/').filter(Boolean)
  const type = TYPES[seg[0]]
  const slug = seg[1]
  const m = type && slug ? bestMatch(slug, type.rows, type.key) : null

  let verdict, note
  if (m && m.score >= 0.5) {
    verdict = '301'
    note = `→ /${seg[0]}/${m.slug}  (${m.label}, khop ${Math.round(m.score * 100)}%)`
  } else if (d.impressions >= 10 || d.clicks > 0 || (d.position > 0 && d.position <= 20)) {
    verdict = 'DUNG_LAI'
    // Chi neu "gan nhat" khi thuc su co diem chung — in ra mot ung vien 0% chi
    // lam nguoi doc phai tu loc nhieu.
    note = m && m.score > 0.15
      ? `khong con gi khop (gan nhat: ${m.label} — ${Math.round(m.score * 100)}%)`
      : 'khong con gi khop trong Sanity'
  } else {
    verdict = 'GIU_404'
    note = 'it hien thi, khong con gia tri'
  }
  return { ...d, path: p, verdict, note }
}).sort((a, b) => b.impressions - a.impressions)

// ── 5. Bang quyet dinh ───────────────────────────────────────────
const totalImpr = pages.reduce((s, p) => s + p.impressions, 0)
const totalClicks = pages.reduce((s, p) => s + p.clicks, 0)
const deadImpr = rows.reduce((s, p) => s + p.impressions, 0)
const deadClicks = rows.reduce((s, p) => s + p.clicks, 0)

console.log(`${c.b}TONG QUAN${c.x}`)
console.log(`  URL Google xep hang : ${pages.length}`)
console.log(`  Trong do 404        : ${c.r}${rows.length}${c.x}`)
console.log(`  Hien thi mat vi 404 : ${c.r}${deadImpr}${c.x} / ${totalImpr}  (${totalImpr ? Math.round(deadImpr / totalImpr * 100) : 0}%)`)
console.log(`  Luot bam mat vi 404 : ${c.r}${deadClicks}${c.x} / ${totalClicks}\n`)

for (const [v, title, col] of [
  ['301', 'DOI SLUG — dat 301, dang tu vut thu hang', c.g],
  ['DUNG_LAI', 'CAN QUYET DINH — con thu hang that, khong con noi dung', c.y],
  ['GIU_404', 'GIU NGUYEN 404 — khong con gia tri', c.d],
]) {
  const g = rows.filter(r => r.verdict === v)
  if (!g.length) continue
  const impr = g.reduce((s, r) => s + r.impressions, 0)
  console.log(`${col}${c.b}[${v}] ${title}${c.x}`)
  console.log(`${col}${g.length} trang · ${impr} hien thi · ${g.reduce((s, r) => s + r.clicks, 0)} bam${c.x}`)
  for (const r of g) {
    console.log(`  ${String(r.impressions).padStart(5)} hien thi ${String(r.clicks).padStart(3)} bam  vi tri ${r.position.toFixed(1).padStart(5)}  ${r.path}`)
    console.log(`        ${c.d}${r.note}${c.x}`)
  }
  console.log()
}

const out = path.join(root, '.scratch', 'dead-pages.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), window: { start: iso(start), end: iso(end) }, totals: { pages: pages.length, dead: rows.length, deadImpr, totalImpr, deadClicks, totalClicks }, rows }, null, 2))
console.log(`${c.d}Chi tiet day du: .scratch/dead-pages.json${c.x}\n`)
