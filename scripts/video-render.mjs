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

// ⚠️ HAI HANG SO NAY PHAI NAM O DAU FILE, khong duoc de canh ham dung chung.
//
// `main()` chay o cap cao nhat cua module. Khai bao `function` duoc keo len nen
// goi duoc tu bat cu dau, nhung `const` thi KHONG — no nam trong vung chet cho
// toi khi cau lenh khai bao chay xong, tuc SAU khi `main()` da ket thuc. De
// `const boNhoKichThuoc` o cuoi file thi `docKichThuoc()` no ra "Cannot access
// before initialization" ngay canh dau tien. Du an da mac dung loi nay mot lan
// o `video-spec.mjs`.
const CO_CHU = [96, 88, 80, 72, 64, 58, 52, 46, 40]
const boNhoKichThuoc = new Map()

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

  // ── Giong doc: doc TRUOC de biet do dai THAT ─────────────────────
  //
  // ⚠️ Thu tu quan trong. Do dai scene phai chay theo do dai giong doc, khong
  // phai nguoc lai. Dat do dai truoc roi ep tieng vao la cach chac chan de chu
  // chay truoc tieng — va loi do chi lo ra khi ngoi xem lai ca video.
  const provider = spec.voice?.provider ?? 'sapi'
  const coTieng = scenes.some(s => s.voiceText) && provider !== 'none'
  if (coTieng) {
    const { docThanhTep } = await import('./tts.mjs')
    // ⚠️ `speakText` truoc `voiceText`: man hinh can `$49.95`, may doc can
    // "49 dollars 95". Lay nham thi giong doc phat "dollar forty nine point
    // nine five" — dung chu nhung nghe nhu may doc bang gia.
    const loiDoc = s => s.speakText || s.voiceText
    const cauCanDoc = scenes.filter(s => s.voiceText).map(loiDoc)
    const soKyTu = cauCanDoc.reduce((n, c) => n + c.length, 0)
    // ⚠️ Noi TRUOC se tieu bao nhieu. Khoa ElevenLabs cua du an khong doc duoc
    // han muc (401 missing_permissions), nen day la con so duy nhat ta co.
    if (provider === 'elevenlabs') info(`${cauCanDoc.length} cau · ${soKyTu} ky tu ElevenLabs (cai da doc roi thi lay tu bo nho dem)`)

    let moi = 0, dem = 0
    for (const [i, s] of scenes.entries()) {
      if (!s.voiceText) continue
      const { tep, giay, tuDem } = await docThanhTep(loiDoc(s), path.join(viec, `tieng-${i}`), {
        provider, giong: spec.voice?.voice, rate: spec.voice?.rate ?? 0,
      }).catch(e => { throw new Error(`Doc scene ${s.id ?? i + 1}: ${e.message}`) })
      tuDem ? dem++ : moi++
      s._tieng = tep
      s._tiengGiay = giay
      // Do dai scene = do dai tieng + khoang lang hai dau. Neu kich ban de san
      // mot con so dai hon thi giu con so do.
      s.duration = Math.max(s.duration ?? 0, +(giay + 0.7).toFixed(2))
    }
    const tong = scenes.reduce((n, s) => n + s.duration, 0) - tDur * (scenes.length - 1)
    ok(`Giong ${provider}: ${moi} cau doc moi, ${dem} lay tu bo nho dem · dai lai thanh ${tong.toFixed(1)}s`)
  }

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

    // ⚠️ KHUNG ANH PHAI GIU DUNG TI LE GOC.
    //
    // Do that 2026-08-22: `zoompan ... s=920x920` ep MOI anh thanh hinh vuong,
    // bat ke anh goc la 3:4 hay 16:9. Mot cai balo cao 1200 rong 800 bi keo
    // ngang thanh beo ra — nguoi xem thay mot mon do khac han mon ho se nhan.
    // Doi voi mot trang affiliate thi do khong phai loi tham my, do la mo ta
    // sai hang.
    //
    // Nen: hoi ffprobe kich thuoc that, roi tinh khung vua khit theo ti le do.
    // `s=` cua zoompan lam ca viec cat lan viec doi kich thuoc, nen chi can
    // khung co cung ti le voi anh la khong con bien dang.
    const { w: aw, h: ah } = await docKichThuoc(s._anh)
    const hop = s.badgeText ? 720 : 920
    const boxW = chan(aw >= ah ? hop : Math.round((hop * aw) / ah))
    const boxH = chan(aw >= ah ? Math.round((hop * ah) / aw) : hop)
    // Phong lon TRUOC khi zoompan (canh dai ~2200): zoompan lam tron toa do ve
    // so nguyen nen o kich thuoc nho no giat thay ro.
    const he = 2200 / Math.max(boxW, boxH)
    const day = s.badgeText ? 300 : 170

    const loc = [
      // Nen: chinh anh do, phu kin khung, lam mo va toi di
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=42:2,eq=brightness=-0.16:saturation=0.7[bg]`,
      // Anh san pham: phong lon roi moi zoompan, khung dung ti le goc
      `[0:v]scale=${chan(Math.round(boxW * he))}:${chan(Math.round(boxH * he))}[to]`,
      `[to]zoompan=z=${zoom}:d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${boxW}x${boxH}:fps=${FPS}[sp]`,
      `[bg][sp]overlay=(W-w)/2:(H-h)/2-${day}[nen]`,
    ]

    // ── Chu tren man ────────────────────────────────────────────────
    //
    // ⚠️ Phu de lay tu `voiceText`, KHONG tu `overlayText`. Truoc day man hinh
    // hien mot khau hieu 2-4 chu trong khi giong doc noi mot cau khac han —
    // nguoi xem doc mot dang va nghe mot dang. Phan lon nguoi xem TikTok de may
    // im tieng, nen chu tren man moi la thu ho thuc su "nghe".
    //
    // ⚠️ VA VI THE CHU DI QUA FILE, khong nhet thang vao chuoi filter.
    //
    // Khau hieu IN HOA 2-4 chu khong bao gio co dau nhay. Cau noi thi co: ngay
    // canh dau tien cua deal #1470 la "your arms just can't hold your baby" —
    // va no lam vo ca filtergraph. Bo phan tich cua ffmpeg boc escape HAI LOP
    // (mot lop cho filtergraph, mot lop cho tham so filter), nen dem dau `\`
    // cho dung la viec de sai, va sai kieu im lang: xem `chay()` o tren, du an
    // da tra gia mot lan voi ky tu `%`.
    //
    // `textfile=` bo han lop do. Chu nam trong mot tep UTF-8, khong ky tu nao
    // can escape nua — dau nhay, hai cham, phan tram, gach cheo deu binh thuong.
    // Ten tep la ten tran trong thu muc viec nen cung khong dinh dau hai cham
    // cua duong dan Windows.
    let nhan = '[nen]'
    let dem = 0
    const veChu = (chu, { toiDaCoChu, y, vien }) => {
      const { dong, coChu } = chiaDong(String(chu ?? ''), W, toiDaCoChu)
      dong.forEach((d, k) => {
        const ten = `chu-${i}-${dem}.txt`
        fs.writeFileSync(path.join(viec, ten), d, 'utf8')
        const ra = `[chu${dem++}]`
        loc.push(
          // `expansion=none`: mac dinh drawtext coi `%` la mo dau cho cu phap
          // `%{...}`; gap `%` don le no bao "Stray %" roi BO CA DONG CHU ma van
          // tra ma thoat 0. Ma "50% OFF" chinh la cau quan trong nhat cua mot
          // video deal. Tat han co che do di.
          `${nhan}drawtext=fontfile=font.ttf:textfile=${ten}:expansion=none:` +
          `fontcolor=white:fontsize=${coChu}:borderw=${vien}:bordercolor=black@0.6:` +
          `x=(w-text_w)/2:y=${y}+${k * Math.round(coChu * 1.24)}${ra}`
        )
        nhan = ra
      })
    }

    // Chu lon cua canh cuoi (% giam, ma giam gia, CTA) nam giua anh va phu de
    if (s.badgeText) veChu(s.badgeText, { toiDaCoChu: 92, y: 'h-830', vien: 8 })
    veChu(s.voiceText, { toiDaCoChu: 68, y: 'h-560', vien: 6 })

    loc.push(`${nhan}null[chu]`)

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
  const chuaTieng = coTieng ? 'hinh.mp4' : raTep
  await chay([
    '-y', ...dau,
    '-filter_complex', chuoi.join(';'),
    '-map', '[ra]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-movflags', '+faststart',
    chuaTieng,
  ], { cwd: viec }).catch(e => { throw new Error(`Noi doan: ${e.message}`) })

  // ── Luot 3: dat tung doan tieng vao dung moc cua scene ───────────
  if (coTieng) {
    // Moc bat dau cua scene i tren dong thoi gian CUOI CUNG. Phai tru phan chong
    // nhau cua tung lan chuyen canh, neu khong tieng se troi dan ve sau — moi
    // lan chuyen la lech them nua giay, den scene thu 10 thi lech 4,5 giay.
    let batDau = 0
    const mocScene = scenes.map((s, i) => {
      if (i > 0) batDau += scenes[i - 1].duration - tDur
      return batDau
    })

    const tiengCo = scenes.map((s, i) => ({ s, i })).filter(x => x.s._tieng)
    const vaoTieng = tiengCo.flatMap(x => ['-i', path.basename(x.s._tieng)])
    const locTieng = tiengCo.map((x, k) => {
      // Lui 0,25 giay so voi dau scene: vao tieng ngay lap tuc nghe rat gap
      const tre = Math.max(0, Math.round((mocScene[x.i] + 0.25) * 1000))
      // ⚠️ `k + 1`, khong phai `k`: dau vao so 0 la VIDEO, cac tep tieng bat dau
      // tu 1. Dung `k` thi ffmpeg di tim luong tieng trong tep video (khong co)
      // va bao "Stream specifier ':a' matches no streams".
      return `[${k + 1}:a]adelay=${tre}|${tre}[a${k}]`
    })
    locTieng.push(`${tiengCo.map((_, k) => `[a${k}]`).join('')}amix=inputs=${tiengCo.length}:normalize=0:dropout_transition=0[tieng]`)

    await chay([
      '-y', '-i', chuaTieng, ...vaoTieng,
      '-filter_complex', locTieng.join(';'),
      '-map', '0:v', '-map', '[tieng]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
      '-movflags', '+faststart',
      raTep,
    ], { cwd: viec }).catch(e => { throw new Error(`Tron tieng: ${e.message}`) })
    ok(`Tron ${tiengCo.length} doan tieng vao video`)
  }

  const raDich = path.join(root, 'out', raTep)
  fs.mkdirSync(path.dirname(raDich), { recursive: true })
  fs.copyFileSync(path.join(viec, raTep), raDich)
  const kb = (fs.statSync(raDich).size / 1024).toFixed(0)
  ok(`Xong: out/${raTep} (${kb} KB)`)
  console.log(`\n  Mo bang: start "" "${raDich}"\n`)
}

/**
 * Ngat dong va chon co chu sao cho VUA khung.
 *
 * ⚠️ `drawtext` khong tu co gian. Chu dai hon khung thi no ve tran ra ngoai va
 * bi cat CA HAI DAU — do that 2026-08-22: ten san pham "FROLK CLASSIC WHISKEY
 * SET" hien ra thanh "OLK CLASSIC WHISKEY S". Nhin qua tuong la loi font.
 *
 * Segoe UI Bold rong trung binh ~0,55 lan co chu. Uoc luong the la du: chi can
 * biet dong nao chac chan khong vua, roi ngat hoac thu nho.
 */
function chiaDong(chu, W, toiDaCoChu = 96) {
  const leHai = 90
  const rongDung = W - leHai * 2
  const dongGoc = String(chu ?? '').split('\n').map(s => s.trim()).filter(Boolean)
  if (!dongGoc.length) return { dong: [], coChu: toiDaCoChu }

  const thu = (coChu, gioiHan) => {
    const toiDa = Math.floor(rongDung / (coChu * 0.55))
    const ra = []
    for (const d of dongGoc) {
      if (d.length <= toiDa) { ra.push(d); continue }
      // Ngat theo TU, khong ngat giua tu — cat giua tu thi doc khong ra chu gi.
      let hienTai = ''
      for (const tu of d.split(/\s+/)) {
        if (!hienTai) hienTai = tu
        else if ((hienTai + ' ' + tu).length <= toiDa) hienTai += ' ' + tu
        else { ra.push(hienTai); hienTai = tu }
      }
      if (hienTai) ra.push(hienTai)
    }
    return ra.length <= gioiHan && ra.every(d => d.length <= toiDa) ? ra : null
  }

  // Uu tien CO CHU LON trong it dong. Chi khi khong co co chu nao vua 3 dong
  // moi cho phep 4 dong, roi 5 — thay vi thu nho mai den luc khong ai doc noi.
  for (const gioiHan of [3, 4, 5]) {
    for (const coChu of CO_CHU) {
      if (coChu > toiDaCoChu) continue
      const ra = thu(coChu, gioiHan)
      if (ra) return { dong: ra, coChu }
    }
  }
  // ⚠️ Dung han, KHONG cat cut. Ban cu cat chu cho vua khung — tuc giao mot
  // video co cau noi do dang ma khong bao gi ca, dung kieu that bai im lang ma
  // `chay()` da phai chan o tren. Cau qua dai thi sua kich ban, dung sua chu.
  throw new Error(`Chu qua dai, khong co co chu nao vua 5 dong: "${dongGoc.join(' ').slice(0, 80)}"`)
}

/**
 * Hoi ffprobe kich thuoc that cua mot anh.
 *
 * Bat buoc phai hoi, khong doan duoc: anh cao tu trang shop co du ti le —
 * vuong 1:1, doc 3:4, ngang 16:9 — va dung chung mot khung cho tat ca chinh la
 * cai loi bop meo san pham.
 */
/** Lam tron ve so chan — H.264 doi chieu rong chia het cho 2. */
function chan(n) { return n % 2 ? n + 1 : n }

function docKichThuoc(tep) {
  if (boNhoKichThuoc.has(tep)) return Promise.resolve(boNhoKichThuoc.get(tep))
  return new Promise((res, rej) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', tep,
    ])
    let ra = ''
    p.stdout.on('data', d => { ra += d })
    p.on('error', rej)
    p.on('close', ma => {
      const m = ra.trim().match(/^(\d+)x(\d+)/)
      if (ma !== 0 || !m) return rej(new Error(`ffprobe khong doc duoc kich thuoc anh: ${tep}`))
      const kq = { w: +m[1], h: +m[2] }
      boNhoKichThuoc.set(tep, kq)
      res(kq)
    })
  })
}

