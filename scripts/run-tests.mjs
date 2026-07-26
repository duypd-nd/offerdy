/**
 * Chay bo test trong `tests/`.
 *
 * Vi sao can mot buoc bundle thay vi goi `node --test tests/` truc tiep: Node doc
 * TypeScript duoc, nhung ESM cua Node BAT BUOC phan mo rong day du trong import
 * (`./affiliateUrl.ts`), con ca du an dung alias `@/lib/...` khong phan mo rong
 * theo chuan cua bundler Next. Sua source cho vua Node se lam ban build Next —
 * doi lai, mot buoc esbuild o day giu source nguyen ven va test van import y het
 * cach cac file trong `src/` import nhau.
 *
 * Chi bundle, khong mock: test chay dung code that trong `src/`.
 */
import { build } from 'esbuild'
import { spawn } from 'node:child_process'
import { readdirSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const testsDir = path.join(root, 'tests')
const outDir = path.join(root, 'node_modules', '.cache', 'offerdy-tests')

const entries = readdirSync(testsDir)
  .filter(f => f.endsWith('.test.ts'))
  .map(f => path.join(testsDir, f))

if (entries.length === 0) {
  console.error('Khong tim thay file .test.ts nao trong tests/')
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

await build({
  entryPoints: entries,
  outdir: outDir,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  // Dependency ngoai giu nguyen (zod, @anthropic-ai/sdk...) — chung chay tot tren
  // Node va bundle vao chi lam cham.
  packages: 'external',
  alias: { '@': path.join(root, 'src') },
  logLevel: 'warning',
  outExtension: { '.js': '.mjs' },
})

const child = spawn(process.execPath, ['--test', path.join(outDir, '*.test.mjs')], {
  stdio: 'inherit',
  cwd: root,
})
child.on('exit', code => process.exit(code ?? 1))
