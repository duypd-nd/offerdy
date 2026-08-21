/**
 * Sinh tep kich ban video tu mot deal — `npm run video:spec <ma deal>`
 *
 * ⚠️ File nay CO Y mong. Toan bo viec nam o `src/lib/video/loadDealSpec.ts`, va
 * trang `/admin/video` goi dung ham do. Neu de moi ben mot ban thi mot ngay nao
 * do cung mot deal se cho ra hai kich ban khac nhau tuy nguoi bam o dau — va
 * khong ai biet ben nao dung. Du an nay da mac dung kieu do voi phep khop ma
 * coupon.
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv, ok, bad, run, stop } from './_vault.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..')

await run(async () => {
  const maDeal = Number(process.argv[2])
  if (!Number.isInteger(maDeal)) { bad('Can ma deal.  npm run video:spec 1199'); stop() }

  console.log('\nSinh kich ban video cho deal #' + maDeal + '\n')
  Object.assign(process.env, loadEnv())

  const tmp = path.join(root, 'node_modules', '.cache', 'offerdy-vspec')
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, 'empty.js'), 'export {}\n')
  fs.writeFileSync(path.join(tmp, 'entry.ts'),
    "export { loadDealSpec } from '@/lib/video/loadDealSpec'\n" +
    "export { tongThoiLuong } from '@/lib/video/buildSpec'\n")
  await build({
    entryPoints: [path.join(tmp, 'entry.ts')], outfile: path.join(tmp, 'entry.mjs'),
    bundle: true, format: 'esm', platform: 'node', target: 'node24',
    packages: 'external',
    alias: { '@': path.join(root, 'src'), 'server-only': path.join(tmp, 'empty.js') },
    logLevel: 'warning',
  })
  const { loadDealSpec, tongThoiLuong } = await import(pathToFileURL(path.join(tmp, 'entry.mjs')).href)

  ok('Dang lay anh, ma giam gia, va nho AI viet loi doc...')
  const r = await loadDealSpec(maDeal)
  if (!r.ok) { bad(r.error); stop() }

  for (const c of r.canhBao) console.log(`    ! ${c}`)
  ok(`${r.soAnh} anh · ${r.maCoupon ? 'ma ' + r.maCoupon : 'khong co ma'}`)
  ok(`${r.spec.scenes.length} canh · dai ${tongThoiLuong(r.spec.scenes).toFixed(1)}s`)
  console.log('')
  for (const s of r.spec.scenes) {
    console.log(`    ${String(s.type).padEnd(12)} ${String(s.duration).padStart(5)}s  ${s.voiceText ?? ''}`)
  }

  const ra = path.join(root, '.scratch', `spec-${maDeal}.json`)
  fs.writeFileSync(ra, JSON.stringify(r.spec, null, 2))
  console.log('')
  ok(`Da ghi: .scratch/spec-${maDeal}.json`)
  console.log(`\n  Dung video:  npm run video:render .scratch/spec-${maDeal}.json\n`)

  fs.rmSync(tmp, { recursive: true, force: true })
})
