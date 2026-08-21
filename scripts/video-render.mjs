/**
 * Dung video san pham tu mot tep kich ban JSON — `npm run video:render <spec.json>`
 *
 * ── VI SAO DUNG FFMPEG TRAN, KHONG DUNG REMOTION ──────────────────
 *
 * Remotion keo theo mot ban Chrome rieng (~150 MB), va **`devDependencies` VAN
 * duoc cai khi Vercel build** — tuc no lam nang moi lan deploy cua site dang
 * chay. Trong khi ffmpeg da co san tren may. Bat dau bang thu re nhat chung minh
 * duoc duong render; neu hieu ung chua du muot thi moi them Remotion vao mot
 * package rieng, ngoai `package.json` goc.
 *
 * ⚠️ VA DAY LA LY DO NANG HON: Vercel KHONG encode video duoc trong moi truong
 * hop — khong co ffmpeg, goi ham 250 MB, ham het gio 60 giay, o dia tam mat sau
 * moi lan chay. Nen phan dung video **bat buoc** nam ngoai duong deploy. Lenh
 * nay chay tren may nguoi van hanh, khong phai tren may chu.
 *
 * ── CACH LAM ──────────────────────────────────────────────────────
 *
 * Hai luot, khong gom vao mot filter_complex khong lo:
 *   1. Moi scene dung thanh mot doan MP4 rieng (nen mo + Ken Burns + chu)
 *   2. Noi cac doan bang `xfade` de chuyen canh muot
 *
 * Tach hai luot vi mot filter_complex 5 scene la mot chuoi vai nghin ky tu —
 * sai mot dau hai cham la loi khong doc noi, va khong cach nao biet scene nao
 * hong.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const info = m => console.log(`    ${m}`)

/** Chay ffmpeg, tra ve Promise. Truyen tham so dang mang — khong qua shell, nen
 *  khong phai lo dau nhay hay khoang trang trong duong dan. */
function chay(args, { im = true, cwd } = {}) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', im ? 'error' : 'info', ...args], {
      cwd,
      stdio: im ? ['ignore', 'ignore', 'pipe'] : 'inherit',
    })
    let loi = ''
    if (im) p.stderr.on('data', d => { loi += d })
    p.on('error', rej)
    p.on('close', code => {
      if (code !== 0) return rej(new Error(loi.trim() || `ffmpeg tra ma ${code}`))
      // ⚠️ MA THOAT 0 KHONG CO NGHIA LA XONG VIEC.
      //
      // Do that 2026-08-22: `drawtext` gap ky tu `%` thi bao "Stray %" ra stderr,
      // BO NGUYEN CA DONG CHU, va van tra ma thoat 0. Video dung ra van mo duoc,
      // dung do dai, dung kich thuoc — chi thieu mat chu "50% OFF", tuc thieu
      // dung cau quan trong nhat cua mot video deal. Khong ai bao gi ca.
      //
      // Nen: bat ky chu nao ffmpeg viet ra stderr deu coi la loi. Tha dung lai
      // vi mot canh bao vo hai con hon giao mot video thieu chu.
      if (loi.trim()) return rej(new Error(loi.trim()))
      res()
    })
  })
}

// ── Doc tep kich ban ───────────────────────────────────────────────
const specPath = process.argv[2]
if (!specPath) {
  console.error('\nCan duong dan toi tep kich ban.\n  npm run video:render .scratch/spec-thu-nghiem.json\n')
  process.exitCode = 1
} else {
  await main(path.resolve(specPath))
}

async function main(specPath) {
  console.log('\nDung video san pham\n')
  if (!fs.existsSync(specPath)) { bad(`Khong thay tep: ${specPath}`); process.exitCode = 1; return }

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  const W = spec.width ?? 1080
  const H = spec.height ?? 1920
  const FPS = spec.fps ?? 30
  const scenes = spec.scenes ?? []
  if (!scenes.length) { bad('Kich ban khong co scene nao'); process.exitCode = 1; return }

  const tDur = spec.transition?.duration ?? 0.5
  const tongDai = scenes.reduce((n, s) => n + s.duration, 0) - tDur * (scenes.length - 1)
  ok(`${scenes.length} scene · ${W}x${H} · ${FPS}fps · dai ${tongDai.toFixed(1)}s`)

  const viec = path.join(root, '.scratch', 'video-job')
  fs.rmSync(viec, { recursive: true, force: true })
  fs.mkdirSync(viec, { recursive: true })

  // ── Font ─────────────────────────────────────────────────────────
  // Chep font vao thu muc viec roi dung ten tran. Duong dan Windows co dau hai
  // cham, ma bo phan tich filtergraph cua ffmpeg coi dau hai cham la dau tach
  // tham so — escape duoc nhung rat de sai.
  const nguonFont = [
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/calibrib.ttf',
  ].find(p => fs.existsSync(p))
  if (!nguonFont) { bad('Khong tim thay font dam nao trong C:/Windows/Fonts'); process.exitCode = 1; return }
  fs.copyFileSync(nguonFont, path.join(viec, 'font.ttf'))
  ok(`Font: ${path.basename(nguonFont)}`)

  // ── Tai anh ve ───────────────────────────────────────────────────
  // ⚠️ Tai ve truoc chu khong de ffmpeg tu goi mang: dung video khong duoc phu
  // thuoc vao viec CDN cua shop con song hay khong o dung giay do.
  const anhCache = new Map()
  for (const [i, s] of scenes.entries()) {
    if (!s.image) { bad(`Scene ${s.id ?? i + 1} khong co anh`); process.exitCode = 1; return }
    if (anhCache.has(s.image)) { s._anh = anhCache.get(s.image); continue }
    // Anh Sanity: xin dung kich thuoc can, do CDN thu nho — dung chinh cach ma
    // src/lib/imageLoader.ts dung cho web.
    const url = s.image.includes('cdn.sanity.io')
      ? `${s.image}${s.image.includes('?') ? '&' : '?'}w=1600&q=90&auto=format`
      : s.image
    const r = await fetch(url)
    if (!r.ok) { bad(`Tai anh that bai (HTTP ${r.status}): ${url.slice(0, 80)}`); process.exitCode = 1; return }
    const tep = path.join(viec, `anh-${anhCache.size}.jpg`)
    fs.writeFileSync(tep, Buffer.from(await r.arrayBuffer()))
    anhCache.set(s.image, tep)
    s._anh = tep
  }
  ok(`Tai ${anhCache.size} anh`)

  // ── Luot 1: moi scene mot doan ───────────────────────────────────
  const doan = []
  for (const [i, s] of scenes.entries()) {
    const n = s.id ?? i + 1
    const frames = Math.round(s.duration * FPS)
    const vao = s.kenBurns !== 'out'
    // Ken Burns muot: phong anh len that lon TRUOC khi zoompan. zoompan lam
    // tron toa do ve so nguyen, nen o kich thuoc nho no giat thay ro.
    const zoom = vao
      ? `'min(zoom+0.0006,1.14)'`
      : `'if(eq(on,1),1.14,max(zoom-0.0006,1.0))'`

    const loc = [
      // Nen: chinh anh do, phu kin khung, lam mo va toi di
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=42:2,eq=brightness=-0.16:saturation=0.7[bg]`,
      // Anh san pham: phong lon roi moi zoompan
      `[0:v]scale=2200:-1[to]`,
      `[to]zoompan=z=${zoom}:d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=920x920:fps=${FPS}[sp]`,
      `[bg][sp]overlay=(W-w)/2:(H-h)/2-170[nen]`,
    ]

    // Chu tren man: moi dong mot lenh drawtext, canh giua
    const dong = String(s.overlayText ?? '').split('\n').filter(Boolean)
    let nhan = '[nen]'
    dong.forEach((d, k) => {
      const ra = k === dong.length - 1 ? '[chu]' : `[chu${k}]`
      loc.push(
        // ⚠️ `expansion=none` la BAT BUOC, khong phai tuy chon. Mac dinh drawtext
        // coi `%` la mo dau cho cu phap `%{...}`; gap `%` don le no bao "Stray %"
        // roi BO CA DONG CHU ma van tra ma thoat 0. Ma "50% OFF" chinh la cau
        // quan trong nhat cua mot video deal. Tat han co che do di.
        `${nhan}drawtext=fontfile=font.ttf:text='${thoatChu(d)}':expansion=none:` +
        `fontcolor=white:fontsize=96:borderw=6:bordercolor=black@0.55:` +
        `x=(w-text_w)/2:y=h-560+${k * 118}${ra}`
      )
      nhan = ra
    })
    if (!dong.length) loc.push(`[nen]null[chu]`)

    await chay([
      '-y', '-loop', '1', '-t', String(s.duration), '-i', s._anh,
      '-filter_complex', loc.join(';'),
      '-map', '[chu]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-r', String(FPS),
      `doan-${i}.mp4`,
    ], { cwd: viec })
      .catch(e => { throw new Error(`Scene ${n}: ${e.message}`) })
    doan.push(`doan-${i}.mp4`)
    info(`scene ${n} (${s.type ?? '?'}) — ${s.duration}s`)
  }
  ok(`Dung ${doan.length} doan`)

  // ── Luot 2: noi bang xfade ───────────────────────────────────────
  const dau = doan.flatMap(f => ['-i', f])
  const chuoi = []
  let truoc = '[0:v]'
  let moc = 0
  for (let i = 1; i < doan.length; i++) {
    // moc = tong thoi luong da ghep TRU di phan chong nhau cua cac lan chuyen
    moc += scenes[i - 1].duration - tDur
    const ra = i === doan.length - 1 ? '[ra]' : `[v${i}]`
    chuoi.push(`${truoc}[${i}:v]xfade=transition=${spec.transition?.type ?? 'fade'}:duration=${tDur}:offset=${moc.toFixed(3)}${ra}`)
    truoc = ra
  }
  if (doan.length === 1) chuoi.push('[0:v]null[ra]')

  const raTep = `${spec.output ?? 'video'}.mp4`
  await chay([
    '-y', ...dau,
    '-filter_complex', chuoi.join(';'),
    '-map', '[ra]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-movflags', '+faststart',
    raTep,
  ], { cwd: viec }).catch(e => { throw new Error(`Noi doan: ${e.message}`) })

  const raDich = path.join(root, 'out', raTep)
  fs.mkdirSync(path.dirname(raDich), { recursive: true })
  fs.copyFileSync(path.join(viec, raTep), raDich)
  const kb = (fs.statSync(raDich).size / 1024).toFixed(0)
  ok(`Xong: out/${raTep} (${kb} KB)`)
  console.log(`\n  Mo bang: start "" "${raDich}"\n`)
}

/**
 * Thoat ky tu cho `drawtext`.
 *
 * ⚠️ KHONG thoat `%`. Da thu ca ba cach (`\%`, `%%`, de nguyen) va CA BA deu bao
 * "Stray %" roi bo mat dong chu. Cach duy nhat chay duoc la `expansion=none` o
 * chinh lenh drawtext — xem cho goi ham nay. Them `\` vao truoc `%` chi lam
 * hong them.
 */
function thoatChu(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\\\\\'")
    .replace(/:/g, '\\:')
}
