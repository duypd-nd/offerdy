/**
 * Go doan <script> con sot trong `description` cua store tren Sanity.
 *
 * Noi dung do da duoc loc o LUC HIEN THI (src/lib/stripScripts.ts) nen khong con
 * gay hai. Nhung no van nam trong kho, va bat cu duong doc nao khac — Studio,
 * xuat Excel, mot trang moi quen goi stripScripts — deu se gap lai.
 *
 * ⚠️ DUNG CHUNG ham loc voi trang web, khong chep lai bieu thuc chinh quy.
 * Chep lai la tao ban thu hai de lech; bundle bang esbuild thi luon dung mot
 * nguon. `stripScripts.ts` la module thuan nen bundle rat nhe.
 *
 * Chay thu (khong ghi):  node .scratch/clean-store-scripts.mjs
 * Ghi that:              node .scratch/clean-store-scripts.mjs --ghi
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv, sanity } from '../scripts/_vault.mjs'

const root = path.resolve(import.meta.dirname, '..')
const tmp = path.join(root, 'node_modules', '.cache', 'offerdy-strip')
fs.mkdirSync(tmp, { recursive: true })
const GHI = process.argv.includes('--ghi')

fs.writeFileSync(path.join(tmp, 'entry.ts'), "export { stripScripts, hasScript } from '@/lib/stripScripts'\n")
await build({
  entryPoints: [path.join(tmp, 'entry.ts')],
  outfile: path.join(tmp, 'entry.mjs'),
  bundle: true, format: 'esm', platform: 'node', target: 'node24',
  packages: 'external', alias: { '@': path.join(root, 'src') }, logLevel: 'warning',
})
const { stripScripts } = await import(pathToFileURL(path.join(tmp, 'entry.mjs')).href)

const db = sanity(loadEnv())
const stores = await db.query(`*[_type == "store" && defined(description) && description match "*<script*"]{ _id, name, description }`)
console.log('So store co <script> trong description:', stores.length)
if (!stores.length) { console.log('Khong co gi de don.'); process.exit(0) }

// ── Sao luu TRUOC khi dung toi bat cu thu gi ─────────────────────
const sao = path.join(root, '.scratch', 'store-description-backup.json')
fs.writeFileSync(sao, JSON.stringify(stores, null, 2))
console.log('Da sao luu nguyen ban ->', path.relative(root, sao), `(${(fs.statSync(sao).size / 1024).toFixed(0)} KB)`)

// ── Tinh phan sau khi loc, va KIEM TUNG CAI ──────────────────────
const viec = []
for (const s of stores) {
  const moi = stripScripts(s.description)
  // ⚠️ Vong chan: chi duoc BOT di, va chi duoc bot dung phan <script>. Neu do
  // dai giam qua nhieu thi co gi do sai — dung lai het, khong ghi cai nao.
  const botDi = s.description.length - moi.length
  if (moi.length >= s.description.length) { console.error('BAT THUONG (khong bot gi):', s.name); process.exit(1) }
  if (botDi > 2000) { console.error(`BAT THUONG (bot ${botDi} ky tu):`, s.name); process.exit(1) }
  if (moi.includes('<script')) { console.error('VAN CON <script> sau khi loc:', s.name); process.exit(1) }
  if (!moi.includes('abs-wrap')) { console.error('MAT the .abs-wrap sau khi loc:', s.name); process.exit(1) }
  viec.push({ id: s._id, name: s.name, moi, botDi })
}

const tong = viec.reduce((n, v) => n + v.botDi, 0)
console.log(`Tat ca ${viec.length} tai lieu deu qua vong chan. Tong cat di ${tong} ky tu, trung binh ${Math.round(tong / viec.length)}/tai lieu.`)
console.log('Vi du:', viec[0].name, '- bot', viec[0].botDi, 'ky tu')

if (!GHI) {
  console.log('\n(chay thu — chua ghi gi. Them --ghi de thuc su ghi)')
  process.exit(0)
}

// ── Ghi theo tung me ─────────────────────────────────────────────
const ME = 20
let xong = 0
for (let i = 0; i < viec.length; i += ME) {
  const me = viec.slice(i, i + ME)
  let tx = db // sanity() cua _vault.mjs chi co query/mutate, nen dung mutate thang
  const mutations = me.map(v => ({ patch: { id: v.id, set: { description: v.moi } } }))
  await tx.mutate(mutations)
  xong += me.length
  console.log(`  da ghi ${xong}/${viec.length}`)
}

// ── Doc lai that su ──────────────────────────────────────────────
const conLai = await db.query(`count(*[_type == "store" && defined(description) && description match "*<script*"])`)
console.log('\nSo store CON <script> sau khi don:', conLai, conLai === 0 ? '✓' : '← VAN CON, kiem tra lai')
