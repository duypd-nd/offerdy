/**
 * Do mot video mau -> bang so.  `npm run video:analyze <tep.mp4>`
 *
 * ── VI SAO KHONG DI QUA "PROMPT CUA VIDEO" ────────────────────────
 *
 * Bo dung khong an prompt, no an THAM SO: `xfade` nao, canh dai may giay, co chu
 * bao nhieu pixel, chu dat o dau. Mot ban mo ta bang loi — du do cong cu nao sinh
 * ra — cung se phai dich lai thanh may con so do, va buoc dich ay chinh la cho
 * sai. Nen do thang ra so.
 *
 * ⚠️ Va vi cung mot bo do nay chay duoc tren CA video mau lan video cua ta, cau
 * hoi "giong chua" tro thanh hai bang so dat canh nhau, khong phai mot y kien.
 *
 * Chia viec:
 *   ffmpeg  — nhip cat, do dai moi lan chuyen  (chinh xac toi khung hinh, mien phi)
 *   Claude  — hinh anh bien doi RA SAO, chu duoc dat the nao  (chi mo ta)
 *   code    — dich mo ta sang ten `xfade`  (`mapTransition`, co test)
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { loadEnv, ok, bad, warn, run, stop } from './_vault.mjs'

/** `_vault.mjs` khong co dong phu — them tai cho cho khoi lech y nghia mau sac. */
const info = m => console.log(`    ${m}`)

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..')

/**
 * ⚠️ DUNG `scdet` DE LAY CA TIN HIEU, KHONG DUNG `select='gt(scene,...)'`.
 *
 * Do that 2026-08-22 tren mot video co ba lan chuyen canh da biet truoc dap an:
 * `select='gt(scene,0.2)'` tim thay **khong mot diem nao**. Ly do rat don gian —
 * mot lan chuyen DAN thi hai khung hinh lien tiep khac nhau rat it, nen diem
 * "canh doi" khong bao gio vuot nguong. Ha nguong xuong thi mot cu lia may cham
 * cung thanh mot cu cat.
 *
 * `scdet=threshold=0` in ra `lavfi.scd.mafd` cho MOI khung hinh — tuc ca duong
 * tin hieu, khong chi nhung cho vuot nguong. Cam ca duong roi tim dai cao thi
 * doc duoc cai ma cach kia khong doc duoc: mot cu cat cung la mot dinh rong MOT
 * khung, con mot lan chuyen dan la mot DAI, va be rong dai chinh la do dai hieu
 * ung. Do lai dung video tren: 1,167s / 0,167s / 0,333s cho ba hieu ung dat
 * 1,2s / 0,2s / 0,8s.
 */

/** San tuyet doi — duoi muc nay thi khong the la mot lan chuyen canh. */
const SAN_MAFD = 0.8

/**
 * He so tren do lech tuyet doi trung vi (MAD).
 *
 * Video ghep anh tinh gan nhu dung yen nen nen tin hieu rat thap; video quay that
 * thi nen cao han. Nguong co dinh se hoac bo sot o loai nay hoac bao thua o loai
 * kia, nen nguong phai tinh tu chinh tin hieu.
 */
const HE_SO_MAD = 6

/** Cho phep tin hieu tut xuong duoi nguong toi 2 khung ma van coi la MOT lan chuyen. */
const KHE_HO_KHUNG = 2

/** So khung rut ra quanh moi lan chuyen de dua cho model nhin. */
const KHUNG_MOI_CHUYEN = 8

/**
 * Noi rong cua so lay khung ra ngoai dai da do, moi ben.
 *
 * ⚠️ Do that, VA CO MOT MUC TOI UU O GIUA: `circleopen` dai 0,8 giay chi lam tin
 * hieu cao len trong 0,3 giay o giua, nen lay khung dung bang dai do duoc thi
 * model chi thay khuc giua va goi nham la "hoa tan". Nhung noi rong len 0,3 giay
 * moi ben thi HONG theo huong nguoc lai: cua so bat dau nuot ca chuyen dong Ken
 * Burns cua chinh canh do, va mot cu truot sang trai bi mo ta thanh "anh phong
 * to" — tuc mo ta chuyen dong cua canh chu khong phai cua mat noi. Giu 0,15.
 */
const NOI_RONG = 0.15

const chay = (lenh, args, opts = {}) => new Promise((res, rej) => {
  const p = spawn(lenh, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], ...opts })
  let ra = ''
  p.stdout.on('data', d => { ra += d })
  p.stderr.on('data', d => { ra += d })
  p.on('error', rej)
  p.on('close', ma => (ma === 0 ? res(ra) : rej(new Error(ra.slice(-700)))))
})

const soGiay = s => Number(s.toFixed(3))

await run(async () => {
  const tepVao = process.argv[2]
  if (!tepVao) { bad('Can duong dan video.  npm run video:analyze .scratch/mau/a.mp4'); stop() }
  if (!fs.existsSync(tepVao)) { bad(`Khong thay tep: ${tepVao}`); stop() }
  Object.assign(process.env, loadEnv())

  const ten = path.basename(tepVao).replace(/\.[^.]+$/, '')
  console.log(`\nDo video mau: ${ten}\n`)

  // ── 1. Kich thuoc, thoi luong ───────────────────────────────────
  const meta = JSON.parse(await chay('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate',
    '-show_entries', 'format=duration',
    '-of', 'json', tepVao,
  ]))
  const W = meta.streams[0].width
  const H = meta.streams[0].height
  const [tu, mau] = String(meta.streams[0].r_frame_rate).split('/')
  const FPS = Number(tu) / Number(mau || 1)
  const dai = Number(meta.format.duration)
  ok(`${W}x${H} · ${FPS.toFixed(0)}fps · ${dai.toFixed(1)}s`)

  // ── 2. Nhip cat ─────────────────────────────────────────────────
  const raw = await chay('ffmpeg', [
    '-v', 'info', '-i', tepVao,
    '-vf', 'scdet=threshold=0,metadata=print:file=-',
    '-f', 'null', '-',
  ])
  const tin = []
  {
    let t = null
    for (const d of raw.split(/\r?\n/)) {
      const mt = d.match(/pts_time:([\d.]+)/)
      if (mt) { t = Number(mt[1]); continue }
      const mv = d.match(/lavfi\.scd\.mafd=([\d.]+)/)
      if (mv && t !== null) { tin.push({ t, v: Number(mv[1]) }); t = null }
    }
  }
  if (!tin.length) { bad('ffmpeg khong tra ve tin hieu scdet nao.'); stop() }

  // Nguong tu tinh tu chinh tin hieu: trung vi + he so × do lech tuyet doi trung vi.
  const trungVi = ds => {
    const s = [...ds].sort((a, b) => a - b)
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  }
  const giaTri = tin.map(x => x.v)
  const tv = trungVi(giaTri)
  const mad = trungVi(giaTri.map(v => Math.abs(v - tv)))
  const nguong = Math.max(SAN_MAFD, tv + HE_SO_MAD * mad)

  // Gom cac khung vuot nguong thanh tung DAI.
  const chuyen = []
  const kheHo = KHE_HO_KHUNG / FPS + 1e-6
  for (const x of tin) {
    if (x.v < nguong) continue
    const cuoi = chuyen[chuyen.length - 1]
    if (cuoi && x.t - cuoi.het <= kheHo + 1 / FPS) { cuoi.het = x.t; cuoi.soKhung++ }
    else chuyen.push({ dau: x.t, het: x.t, soKhung: 1 })
  }
  for (const c of chuyen) {
    c.giua = soGiay((c.dau + c.het) / 2)
    // Mot dai rong 1-2 khung = cat cung. Rong hon = chuyen dan, va be rong chinh
    // la do dai hieu ung (cong mot khung vi khung dau tien da nam TRONG hieu ung).
    c.dai = c.soKhung <= 2 ? 0 : soGiay(c.het - c.dau + 1 / FPS)
    c.kieu = c.dai === 0 ? 'cat' : 'chuyen'
  }
  info(`nguong mafd ${nguong.toFixed(2)} (trung vi ${tv.toFixed(2)}, MAD ${mad.toFixed(2)})`)

  if (!chuyen.length) { bad('Khong tim thay diem cat nao — video mot canh, hoac nguong qua cao.'); stop() }

  // Do dai tung canh = khoang giua cac diem chuyen, ke ca canh dau va canh cuoi.
  const canh = []
  let truoc = 0
  for (const c of chuyen) { canh.push(soGiay(c.giua - truoc)); truoc = c.giua }
  canh.push(soGiay(dai - truoc))

  const tb = canh.reduce((a, b) => a + b, 0) / canh.length
  const soCat = chuyen.filter(c => c.kieu === 'cat').length
  ok(`${canh.length} canh · ${chuyen.length} lan chuyen (${soCat} cat cung, ${chuyen.length - soCat} chuyen dan)`)

  // ── 3. Rut khung hinh ───────────────────────────────────────────
  const thuMuc = path.join(root, '.scratch', `khung-${ten}`)
  fs.rmSync(thuMuc, { recursive: true, force: true })
  fs.mkdirSync(thuMuc, { recursive: true })

  /** Rut `so` khung deu nhau trong khoang [tu, den]. Tra ve base64 theo thu tu. */
  const rutKhung = async (tu2, den, so, nhan) => {
    const b = []
    for (let k = 0; k < so; k++) {
      const t = Math.max(0, tu2 + ((den - tu2) * k) / Math.max(1, so - 1))
      const tep = path.join(thuMuc, `${nhan}-${k}.png`)
      // `-ss` TRUOC `-i` de ffmpeg nhay thang toi moc, khong giai ma tu dau.
      // Ha do phan giai xuong 640 chieu rong: model khong can 1080px de thay mot
      // buc anh dang truot sang trai, ma anh nho thi request nhe han nhieu.
      await chay('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', tepVao,
        '-frames:v', '1', '-vf', 'scale=640:-2', tep])
      if (fs.existsSync(tep)) b.push(fs.readFileSync(tep).toString('base64'))
    }
    return b
  }

  const nhomChuyen = []
  for (let i = 0; i < chuyen.length; i++) {
    const c = chuyen[i]
    const nua = Math.max(c.dai, 2 / FPS) / 2 + NOI_RONG
    nhomChuyen.push({ index: i, khung: await rutKhung(c.giua - nua, c.giua + nua, KHUNG_MOI_CHUYEN, `c${i}`) })
  }

  // Mot khung giua moi canh, de doc kieu chu.
  const khungChu = []
  {
    let t0 = 0
    for (let i = 0; i < canh.length; i++) {
      const t1 = i < chuyen.length ? chuyen[i].giua : dai
      const [b] = await rutKhung((t0 + t1) / 2, (t0 + t1) / 2, 1, `chu${i}`)
      if (b) khungChu.push(b)
      t0 = t1
    }
  }
  ok(`Rut ${nhomChuyen.reduce((n, g) => n + g.khung.length, 0)} khung chuyen canh + ${khungChu.length} khung chu`)

  // ── 4. Cho model nhin ───────────────────────────────────────────
  const tmp = path.join(root, 'node_modules', '.cache', 'offerdy-vanalyze')
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, 'empty.js'), 'export {}\n')
  fs.writeFileSync(path.join(tmp, 'entry.ts'),
    "export { judgeTransitions, judgeTextStyle } from '@/lib/ai/judgeTransitions'\n" +
    "export { mapTransition } from '@/lib/video/mapTransition'\n")
  await build({
    entryPoints: [path.join(tmp, 'entry.ts')], outfile: path.join(tmp, 'entry.mjs'),
    bundle: true, format: 'esm', platform: 'node', target: 'node24',
    packages: 'external',
    alias: { '@': path.join(root, 'src'), 'server-only': path.join(tmp, 'empty.js') },
    logLevel: 'warning',
  })
  const { judgeTransitions, judgeTextStyle, mapTransition } =
    await import(pathToFileURL(path.join(tmp, 'entry.mjs')).href)

  ok('Dang cho Claude nhin cac khung hinh...')
  const [moTa, kieuChu] = await Promise.all([
    judgeTransitions(nhomChuyen),
    judgeTextStyle(khungChu),
  ])
  if (!moTa) warn('KHONG doc duoc hieu ung chuyen canh — chi co so lieu nhip cat.')
  if (!kieuChu) warn('KHONG doc duoc kieu chu.')

  // ── 5. Dich sang ten xfade ──────────────────────────────────────
  const theoChiSo = new Map((moTa ?? []).map(m => [m.index, m]))
  for (let i = 0; i < chuyen.length; i++) {
    const m = theoChiSo.get(i)
    chuyen[i].moTa = m?.moTa ?? null
    chuyen[i].chuChay = m?.chuChay ?? null
    // Dai bang 0 = cat cung do CHINH ffmpeg do duoc — tin so do hon tin mo ta.
    const anhXa = chuyen[i].dai === 0 ? { type: 'cat', thay: false } : mapTransition(m?.moTa ?? '')
    chuyen[i].xfade = anhXa.type
    chuyen[i].thay = anhXa.thay
  }

  // ── 6. Bang so ──────────────────────────────────────────────────
  const daiChuyen = chuyen.filter(c => c.dai > 0).map(c => c.dai)
  const tbChuyen = daiChuyen.length ? daiChuyen.reduce((a, b) => a + b, 0) / daiChuyen.length : 0
  const chuCo = (kieuChu ?? []).filter(k => k.coChu)
  const tbViTri = chuCo.length ? chuCo.reduce((n, k) => n + k.viTri, 0) / chuCo.length : null
  const tbCao = chuCo.length ? chuCo.reduce((n, k) => n + k.cao, 0) / chuCo.length : null

  console.log(`\n  ── NHIP CAT ──`)
  console.log(`  Canh dau tien   : ${canh[0].toFixed(2)}s`)
  console.log(`  Canh trung binh : ${tb.toFixed(2)}s   (ngan nhat ${Math.min(...canh).toFixed(2)}s · dai nhat ${Math.max(...canh).toFixed(2)}s)`)
  console.log(`  Cat cung        : ${soCat}/${chuyen.length}`)
  console.log(`  Chuyen dan dai  : ${tbChuyen ? tbChuyen.toFixed(2) + 's trung binh' : '(khong co)'}`)

  console.log(`\n  ── TUNG LAN CHUYEN ──`)
  for (let i = 0; i < chuyen.length; i++) {
    const c = chuyen[i]
    const co = c.thay ? '\x1b[33m~\x1b[0m' : ' '
    console.log(`  ${co} ${String(c.giua).padStart(7)}s  ${String(c.dai).padStart(5)}s  ${String(c.xfade).padEnd(12)} ${c.moTa ?? ''}`)
  }
  const soThay = chuyen.filter(c => c.thay).length
  if (soThay) warn(`${soThay} hieu ung KHONG co tuong duong trong xfade — da thay bang \`fade\`. Xem dau \`~\`.`)

  if (chuCo.length) {
    console.log(`\n  ── CHU TREN MAN ──`)
    console.log(`  Co chu o ${chuCo.length}/${(kieuChu ?? []).length} canh`)
    console.log(`  Vi tri doc     : ${(tbViTri * 100).toFixed(1)}% tinh tu dinh  (cua ta: ${((1 - 560 / 1920) * 100).toFixed(1)}%)`)
    console.log(`  Chieu cao dong : ${(tbCao * 100).toFixed(2)}% chieu cao khung  (cua ta: ${((68 / 1920) * 100).toFixed(2)}%)`)
    console.log(`  Kieu           : ${chuCo[0].kieu}${chuCo[0].hoa ? ' · IN HOA' : ''}`)
  }

  // ── 7. Ghi tep ──────────────────────────────────────────────────
  const raTep = path.join(root, '.scratch', `phan-tich-${ten}.json`)
  fs.writeFileSync(raTep, JSON.stringify({
    ten, width: W, height: H, fps: FPS, duration: dai,
    canh, // Bo `dau`/`het`/`soKhung` — chung la buoc trung gian cua phep do, khong phai
    // ket qua. Giu lai chi lam nguoi doc tuong day la con so dang tin.
    chuyen: chuyen.map(c => ({
      giua: c.giua, dai: c.dai, kieu: c.kieu,
      moTa: c.moTa, chuChay: c.chuChay, xfade: c.xfade, thay: c.thay,
    })),
    chu: kieuChu ?? null,
    tomTat: {
      canhDau: canh[0], canhTrungBinh: soGiay(tb),
      catCung: soCat, tongChuyen: chuyen.length,
      chuyenTrungBinh: soGiay(tbChuyen),
      chuViTri: tbViTri, chuCao: tbCao,
      khongCoTuongDuong: soThay,
    },
  }, null, 2))
  console.log(`\n  Ghi: ${path.relative(root, raTep)}`)
  console.log(`  Khung hinh: ${path.relative(root, thuMuc)}\n`)
})
