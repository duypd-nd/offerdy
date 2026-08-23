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

  /**
   * Phong cach: vi tri, co chu, kich thuoc khung anh — tinh theo TI LE khung
   * hinh chu khong phai pixel, de so duoc voi mot video mau o do phan giai khac.
   * Kich ban cu khong co `style` thi moi cho deu roi ve con so viet cung truoc day.
   */
  const stChung = spec.style ?? {}

  /**
   * Chuyen canh RA khoi scene `i` — moi mat noi mot con so rieng.
   *
   * ⚠️ Truoc 2026-08-22 ca video dung MOT kieu va MOT do dai. Kich ban cu khong
   * co `transitionOut` nen roi ve `spec.transition` va chay y nhu truoc.
   */
  const chuyenRa = i => ({
    type: scenes[i]?.transitionOut?.type ?? spec.transition?.type ?? 'fade',
    dai: scenes[i]?.transitionOut?.duration ?? tDur,
  })

  /**
   * Moc bat dau cua tung scene tren dong thoi gian CUOI CUNG — MOT bang duy nhat.
   *
   * ⚠️ VI SAO PHAI DUNG CHUNG: con so nay quyet dinh ca hai thu — `offset` cua
   * `xfade` khi noi hinh, va `adelay` khi dat tung doan tieng. Truoc day hai cho
   * tu tinh lay, moi cho mot vong lap giong nhau. Chung khop nhau chi vi ca hai
   * cung nhan `tDur`; tu khi moi mat noi mot do dai rieng thi hai ban sao chac
   * chan se lech, va cai lech ra la TIENG TROI KHOI HINH — moi canh mot chut,
   * den canh cuoi la vai giay.
   */
  /**
   * ⚠️ TINH BANG SO KHUNG NGUYEN, khong bang giay.
   *
   * `xfade` doi dau vao thu nhat phai dai it nhat `offset + duration`. Cong thuc
   * o day dat no **dung bang**, khong du mot ly:
   *
   *     moc[i]            = moc[i-1] + dai[i-1] - chuyen[i-1]
   *     moc[i] + chuyen[i-1] = moc[i-1] + dai[i-1]   <- dung bang do dai tich luy
   *
   * Nam sat mep nhu vay thi BAT KY sai so lam tron nao cung day no vuot. Do that
   * 2026-08-23 tren phong cach `mau-giay` (32 canh): mot mat noi can toi 6,483s
   * trong khi luong tich luy chi co 6,467s — **thieu nua khung hinh**. `xfade`
   * khong bao loi, no chi tra ve luong cu; ca 24 canh phia sau bien mat, video
   * ra 6,5s thay vi 29,4s.
   *
   * Chuyen het sang so khung nguyen thi dang thuc tren dung TUYET DOI, khong con
   * cho cho sai so. Do lai cung kich ban: 29,39s dung bang ky vong.
   */
  /**
   * ⚠️ Chuyen canh phai NGAN HON ca hai canh no noi. Mot canh 1,0s ma chuyen
   * canh 1,2s thi khong con khung nao de fade — `xfade` nuot doan do. Ep xuong
   * thay vi de no vo, va bao ra man hinh de nguoi dung biet phong cach dang doi
   * hoi mot nhip nhanh hon canh cho phep.
   */
  const khungChuyen = i => {
    const muon = Math.max(1, Math.round(chuyenRa(i).dai * FPS))
    const tran = Math.max(1, Math.min(khungDoan[i] ?? muon, khungDoan[i + 1] ?? muon) - 1)
    return Math.min(muon, tran)
  }
  /** So khung that cua tung doan — dat sau Luot 1. Truoc do uoc tu `duration`. */
  let khungDoan = scenes.map(s => Math.max(1, Math.round(s.duration * FPS)))

  const tinhMocKhung = () => {
    const m = []
    for (let i = 0, k = 0; i < scenes.length; i++) {
      if (i > 0) k += khungDoan[i - 1] - khungChuyen(i - 1)
      m.push(k)
    }
    return m
  }
  const tinhMoc = () => tinhMocKhung().map(k => k / FPS)
  const tongDaiHienTai = m => m[scenes.length - 1] + khungDoan[scenes.length - 1] / FPS
  ok(`${scenes.length} scene · ${W}x${H} · ${FPS}fps · dai ${tongDaiHienTai(tinhMoc()).toFixed(1)}s`)

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
      // ⚠️ `tiepNoi` = canh nay chi doi ANH, cau van la cau cua canh truoc. Doc
      // lai o day thi mot cau bi phat hai ba lan chong len nhau.
      if (!s.voiceText || s.tiepNoi) continue
      const { tep, giay, tuDem, tu } = await docThanhTep(loiDoc(s), path.join(viec, `tieng-${i}`), {
        provider, giong: spec.voice?.voice, rate: spec.voice?.rate ?? 0,
      }).catch(e => { throw new Error(`Doc scene ${s.id ?? i + 1}: ${e.message}`) })
      tuDem ? dem++ : moi++
      s._tieng = tep
      s._tiengGiay = giay
      s._tu = tu

      // ⚠️ Do dai phai do CA NHOM, khong do rieng canh dau.
      //
      // Mot cau 5 giay nay trai ra 4 canh hinh 1,3 giay. Ep rieng canh dau bang
      // 5 giay thi nhom thanh 5 + 1,3 x 3 = gan 9 giay, tieng het tu lau ma hinh
      // van chay — va moi nhip lai dai them mot cuc nhu vay.
      const nhom = [s]
      for (let k = i + 1; k < scenes.length && scenes[k].tiepNoi; k++) nhom.push(scenes[k])
      const can = +(giay + 0.7).toFixed(2)
      const dangCo = nhom.reduce((n, x) => n + x.duration, 0)
      // Thieu bao nhieu thi cong het vao canh CUOI cua nhom: keo canh dau se lam
      // canh mo dau dai bat thuong, con dan deu thi moi canh le mot chut.
      if (can > dangCo) nhom[nhom.length - 1].duration = +(nhom[nhom.length - 1].duration + can - dangCo).toFixed(2)
    }
    ok(`Giong ${provider}: ${moi} cau doc moi, ${dem} lay tu bo nho dem · dai lai thanh ${tongDaiHienTai(tinhMoc()).toFixed(1)}s`)
  }

  // ⚠️ TINH MOC SAU BUOC GIONG DOC, khong truoc. Buoc tren vua KEO DAI cac canh
  // cho vua cau noi; tinh moc truoc do la tinh tren nhung con so da cu, va moi
  // doan tieng se bi dat sai cho.
  //
  // ⚠️ Va day VAN chua phai bang cuoi cung: sau Luot 1 con phai do lai do dai
  // THAT cua tung doan da ma hoa roi tinh lai (xem "Do lai do dai that" ben duoi).
  let mocScene = tinhMoc()

  /**
   * Moc tung chu tren TUNG CANH, de phu de chay dung theo giong doc.
   *
   * Mot nhip loi trai ra nhieu canh hinh, nen phai cat danh sach chu theo cua so
   * thoi gian cua tung canh: canh nao hien nhung chu duoc doc trong luc no chay.
   *
   * ⚠️ Cong `TRE_TIENG`: tieng duoc dat lui 0,25 giay so voi dau canh (xem buoc
   * tron tieng ben duoi). Quen no thi chu chay truoc tieng dung 0,25 giay — du de
   * thay la sai nhung khong du de doan ra vi sao.
   */
  const TRE_TIENG = 0.25
  // ⚠️ Boc thanh HAM chu khong chay ngay: phai dung lai sau Luot 1, khi da biet
  // do dai that cua tung doan. Chay mot lan o day thi phu de bam vao moc cu.
  const dungNhip = () => {
  const cacNhip = []
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]
    if (!s.voiceText || s.tiepNoi) continue

    const nhom = [i]
    for (let k = i + 1; k < scenes.length && scenes[k].tiepNoi; k++) nhom.push(k)

    // ⚠️ Chi dung moc that khi chu tren man DUNG BANG chu doc len. Canh gia va
    // canh ma co `speakText` rieng ("49 dollars 95" cho may doc, "$49.95" cho
    // man hinh) — so tu khac nhau, nen gan moc cua ben nay cho ben kia se lam
    // chu chay lech han. Nhung canh do chia deu theo do dai tung tu.
    const khopChu = !s.speakText || s.speakText === s.voiceText
    const tuGoc = String(s.voiceText).trim().split(/\s+/).filter(Boolean)
    let tu = khopChu && Array.isArray(s._tu) && s._tu.length === tuGoc.length ? s._tu : null

    if (!tu) {
      const tongKyTu = tuGoc.reduce((n, w) => n + w.length, 0) || 1
      const dai = s._tiengGiay ?? Math.max(1, nhom.reduce((n, k) => n + scenes[k].duration, 0) - 0.7)
      let t = 0
      tu = tuGoc.map(w => {
        const d = (dai * w.length) / tongKyTu
        const r = { chu: w, dau: t, het: t + d }
        t += d
        return r
      })
    }

    // ⚠️ MOT CHU DUNG NGUYEN TOI KHI CHU SAU LEN — khong tat di roi hien lai.
    //
    // Moc that cua ElevenLabs co khe ho 0,03-0,07 giay giua cac tu (giong doc
    // nao cung co). Ve dung theo moc do thi man hinh CHOP TRANG giua tung chu,
    // va o mot video 30 giay thi do la vai chuc lan nhap nhay — nhin met mat va
    // khong giong bat cu phu de TikTok nao. Keo het cua chu nay toi dau cua chu
    // ke tiep thi chu chuyen muot, van dung nhip.
    for (let k = 0; k < tu.length - 1; k++) tu[k] = { ...tu[k], het: tu[k + 1].dau }
    if (tu.length) {
      const cuoi = tu[tu.length - 1]
      tu[tu.length - 1] = { ...cuoi, het: cuoi.het + 0.35 }
    }

    // Giu nguyen ca danh sach chu cho CA NHIP — khong cat theo tung canh nua.
    // Phu de duoc dot vao sau khi noi cac doan, tren dong thoi gian cuoi cung,
    // nen mot chu nam vat qua hai canh khong con bi cat lam doi.
    cacNhip.push({ batDau: mocScene[i] + TRE_TIENG, tu })
  }
  return cacNhip
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
    // ⚠️ Kich thuoc khung anh doc tu phong cach, tinh theo % chieu rong khung
    // hinh. Phong cach hoc tu video mau de anh gan kin be ngang va chu de len
    // anh — mau khong chua dai trong nao de dat chu.
    const hop = Math.round(W * (s.badgeText
      ? (stChung.anhKhungBadge ?? 720 / 1080)
      : (stChung.anhKhung ?? 920 / 1080)))
    const boxW = chan(aw >= ah ? hop : Math.round((hop * aw) / ah))
    const boxH = chan(aw >= ah ? Math.round((hop * ah) / aw) : hop)
    // Phong lon TRUOC khi zoompan (canh dai ~2200): zoompan lam tron toa do ve
    // so nguyen nen o kich thuoc nho no giat thay ro.
    const he = 2200 / Math.max(boxW, boxH)
    const day = Math.round(H * (s.badgeText
      ? (stChung.anhLechBadge ?? 300 / 1920)
      : (stChung.anhLech ?? 170 / 1920)))

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
    const veChu = (chu, { toiDaCoChu, y, vien, khung }) => {
      const { dong, coChu } = chiaDong(String(chu ?? ''), W, toiDaCoChu)
      const buoc = Math.round(coChu * 1.24)
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
          (khung ? `box=1:boxcolor=black@0.55:boxborderw=20:` : '') +
          `x=(w-text_w)/2:y=${y}+${k * buoc}${ra}`
        )
        nhan = ra
      })
      // Tra ve so dong va buoc dong de nguoi goi biet dong ke tiep dat o dau.
      // Phu de dai ngan tuy cau noi, nen mot toa do co dinh cho dong link se
      // chong len phu de o nhung canh cau dai.
      return { soDong: dong.length, buoc }
    }

    // ⚠️ Vi tri va co chu doc tu `spec.style`, tinh theo % CHIEU CAO khung chu
    // khong phai pixel: de so duoc voi mot video mau tai ve o do phan giai khac
    // (720×1280 hay 1080×1920 deu ra cung mot ti le). Thieu `style` — kich ban
    // cu — thi roi ve dung cac con so viet cung truoc day.
    const st = stChung
    const cachDay = (ti, macDinh) => Math.round(H * (ti ?? macDinh / 1920))
    const coChuTu = (ti, macDinh) => Math.round(H * (ti ?? macDinh / 1920))

    // Chu lon cua canh cuoi (% giam, ma giam gia, CTA) nam giua anh va phu de
    if (s.badgeText) {
      veChu(s.badgeText, {
        toiDaCoChu: coChuTu(st.badgeCo, 92),
        y: `h-${cachDay(st.badgeCachDay, 830)}`,
        // ⚠️ Vien doc tu phong cach, khong viet cung nua. Mau `Giay.mp4` dat chu
        // gan nhu khong vien; nhung 0 la nguy hiem tren anh san pham sang mau,
        // nen phong cach do dung 3 chu khong phai 0. Kich ban cu khong khai
        // `badgeVien` thi roi ve dung 8 nhu truoc — khong doi mot khung hinh nao.
        vien: Math.max(0, cachDay(st.badgeVien, 8)),
      })
    }
    const PHU_DE_CACH_DAY = cachDay(st.phuDeCachDay, 560)
    const PHU_DE_Y = H - PHU_DE_CACH_DAY

    // ⚠️ PHU DE KHONG VE O DAY NUA — no duoc dot vao SAU khi noi cac doan, bang
    // mot tep ASS tren dong thoi gian cuoi cung (xem `phuDeAss()` o cuoi file).
    //
    // Ly do: mot dong nhieu chu, chu dang doc thi noi len. De to sang mot chu
    // NAM TRONG mot dong thi phai biet chu do bat dau o toa do x nao — tuc phai
    // do be rong tung chu bang chinh font se ve. `drawtext` khong noi cho ai
    // biet be rong cua no, con `chiaDong()` chi uoc luong `0,55 x co chu` moi ky
    // tu: sai vai chuc pixel khi cong don, va vai chuc pixel nghia la cac manh
    // chu chong len nhau hoac ho ra.
    //
    // libass thi dan chu bang chinh font do, nen viec nay thanh mien phi. Va ve
    // tren dong thoi gian cuoi con bo luon mot cai kho khac: mot chu nam vat qua
    // hai canh khong con bi cat lam doi.
    const phuDe = { soDong: 1, buoc: Math.round(coChuTu(st.chuChayCo, 62) * 1.3) }

    // ── Dia chi web, chi o canh CTA ─────────────────────────────────
    //
    // ⚠️ Mot video khong do duoc chi la mot tai san dep. Duong do duoc chinh la
    // link o bio/caption (`spec.product.ctaUrl`, mang nhan `?s=video`); dong chu
    // nay lam hai viec con lai: nho ten mien, va cho nguoi xem mot cach vao
    // dung deal ma khong phai tim trong bio.
    //
    // Khong ve `?s=video` len man: khong ai go mot chuoi truy van, va go sai thi
    // hong ca dia chi.
    if (s.linkText) {
      const y = PHU_DE_Y + phuDe.soDong * phuDe.buoc + 26
      // Ngoi duoi cung nen phai tranh dai giao dien TikTok (~250px cuoi man).
      if (y + 62 > H - 250) info(`scene ${n}: link nam thap (${y}px) — co the bi giao dien TikTok che`)
      veChu(s.linkText, { toiDaCoChu: 52, y: String(y), vien: 4, khung: true })
    }

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

  // ── Do lai do dai THAT cua tung doan ─────────────────────────────
  //
  // ⚠️ ĐÂY LÀ CHỖ TỪNG LÀM MẤT ĐOẠN CUỐI CỦA VIDEO MÀ KHÔNG BÁO GÌ.
  //
  // Do that 2026-08-23, kich ban 24 canh: ffmpeg bao "Xong", ma track hinh chi
  // dai 18,9s trong khi tieng dai 27,6s — bon canh cuoi, gom ca canh MA GIAM
  // GIA va canh CTA, khong he co trong video. Chay rieng chuoi noi thi thay
  // `drop=352`: ffmpeg vut di 352 khung.
  //
  // Nguyen nhan: `mocScene` tinh tu `s.duration` trong kich ban, nhung ffmpeg
  // ma hoa theo KHUNG HINH. `-t 1.3` o 30fps dang le 39 khung, ma `1.3 * 30`
  // trong so thuc la 39.000000000000007 nen thanh 40 khung = 1,3333 giay. Moi
  // canh du ra vai phan tram giay; hai muoi ba canh thi `offset` cua `xfade`
  // som gan nua giay so voi thuc te, PTS dam nhau, va bo loc `-r` vut khung.
  //
  // Nen: do lai bang ffprobe roi lay CHINH con so do lam su that. Sau buoc nay
  // `scenes[i].duration` = do dai that cua `doan-i.mp4`, khong sai mot khung.
  //
  // ⚠️ Do bang SO KHUNG chu khong bang giay: dong thoi gian noi canh tinh toan
  // bo bang khung nguyen (xem `tinhMocKhung`), nen phai lay dung don vi do.
  khungDoan = []
  for (let i = 0; i < scenes.length; i++) {
    const k = await docSoKhung(`doan-${i}.mp4`, viec)
    khungDoan.push(k)
    scenes[i].duration = +(k / FPS).toFixed(6)
  }
  mocScene = tinhMoc()
  const cacNhip = dungNhip()
  info(`Do lai do dai that: ${tongDaiHienTai(mocScene).toFixed(2)}s`)

  // ── Luot 2: noi bang xfade ───────────────────────────────────────
  const dau = doan.flatMap(f => ['-i', f])
  const chuoi = []

  /**
   * ⚠️ CHUAN HOA DAU THOI GIAN TRUOC KHI NOI — thieu buoc nay thi video BI CUT
   * NGAN MA KHONG BAO LOI.
   *
   * Do that 2026-08-23 tren mot kich ban 24 canh: ffmpeg bao "Xong", ma track
   * hinh chi dai 18,9s trong khi tieng dai 27,6s. Nghia la bon canh cuoi —
   * gom ca canh MA GIAM GIA va canh CTA — khong he co trong video. Chay rieng
   * chuoi noi de xem thi ffmpeg in `drop=830`: no vut di 830 khung.
   *
   * Ly do: moi `doan-i.mp4` la mot tep rieng, timebase va PTS goc cua chung
   * khong dong bo. Noi mot hai cai thi khong sao; noi hai muoi ba cai thi sai
   * so tich lai, PTS dam nhau, va bo loc `-r` o dau ra vut bot khung.
   *
   * `settb=AVTB` dua moi dau vao ve cung mot timebase, `setpts=PTS-STARTPTS`
   * keo moc dau ve 0, `fps` ep dung nhip. Do lai cung kich ban: 27,167s dung
   * bang ky vong, `drop=0`.
   *
   * ⚠️ Dung xoa ba bo loc nay cho gon. Chung khong lam gi thay doi duoc bang
   * mat thuong — cho toi khi video dai hon mot chut la mat han doan cuoi.
   */
  for (let i = 0; i < doan.length; i++) {
    chuoi.push(`[${i}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=${FPS}[s${i}]`)
  }

  let truoc = '[s0]'
  for (let i = 1; i < doan.length; i++) {
    // Mat noi thu `i` bat dau dung o thoi diem scene `i` bat dau tren dong thoi
    // gian cuoi cung — lay tu `mocScene`, KHONG tu tinh lai (xem ly do o tren).
    const { type } = chuyenRa(i - 1)
    // ⚠️ Do dai chuyen canh phai lay DUNG con so da dung de tinh moc — tuc ban
    // da lam tron ve khung nguyen. Dua `chuyenRa().dai` tho vao day la hai ben
    // lech nhau vai phan nghin giay, va vai phan nghin do du de `xfade` truot
    // qua mep roi nuot ca doan sau.
    const dai = khungChuyen(i - 1) / FPS
    const ra = i === doan.length - 1 ? '[ra]' : `[v${i}]`
    chuoi.push(`${truoc}[s${i}]xfade=transition=${type}:duration=${dai.toFixed(6)}:offset=${mocScene[i].toFixed(6)}${ra}`)
    truoc = ra
  }
  if (doan.length === 1) chuoi.push('[s0]null[ra]')

  // ── Dot phu de chay len tren ────────────────────────────────────
  //
  // ⚠️ Dot O DAY, sau khi da noi cac doan: phu de chay theo GIONG DOC chu khong
  // theo canh, va mot chu nam vat qua hai canh se bi cat lam doi neu ve o luot
  // truoc. Tren dong thoi gian cuoi cung thi khong con chuyen do.
  let raCuoi = '[ra]'
  if (cacNhip.length) {
    const coChuAss = Math.round(H * (stChung.chuChayCo ?? 62 / 1920))
    const cachDayAss = Math.round(H * (stChung.phuDeCachDay ?? 560 / 1920))
    fs.writeFileSync(path.join(viec, 'phude.ass'),
      phuDeAss(cacNhip, { W, H, coChu: coChuAss, cachDay: cachDayAss }), 'utf8')
    // `fontsdir=.` de libass dung dung tep font da chep vao thu muc viec, khong
    // phai di tim trong he thong. Ten tep tran vi lenh chay voi cwd la thu muc do.
    chuoi.push(`[ra]subtitles=phude.ass:fontsdir=.[pd]`)
    raCuoi = '[pd]'
  }

  // Chuoi noi la thu dau tien can nhin khi video ra sai do dai. Ghi kem khi
  // nguoi dung da yeu cau giu lai thu muc tam.
  if (process.env.GIU_RAC) fs.writeFileSync(path.join(viec, 'chuoi-noi.txt'), chuoi.join(';\n'), 'utf8')
  const raTep = `${spec.output ?? 'video'}.mp4`
  const chuaTieng = coTieng ? 'hinh.mp4' : raTep
  await chay([
    '-y', ...dau,
    '-filter_complex', chuoi.join(';'),
    '-map', raCuoi,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-movflags', '+faststart',
    chuaTieng,
  ], { cwd: viec }).catch(e => { throw new Error(`Noi doan: ${e.message}`) })

  // ── Luot 3: dat tung doan tieng vao dung moc cua scene ───────────
  if (coTieng) {
    // Moc dat tieng lay tu CHINH bang `mocScene` da dung de noi hinh. Hai ban
    // sao cua cung mot phep tinh la cach chac chan de tieng troi khoi hinh.
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

  // ── Tu kiem truoc khi giao ────────────────────────────────────────
  //
  // ⚠️ LOP CHAN NAY SINH RA TU HAI LAN BI CAT CUT TRONG CUNG MOT NGAY (23/08).
  //
  // Ca hai lan `xfade` truot khoi mep mot phan nho hon mot khung hinh, nuot sach
  // cac canh phia sau, VA KHONG BAO GI: ma thoat 0, tep mo duoc, chi la track
  // hinh dung o giua chung con tieng thi chay tiep. Lan dau mat 4 canh cuoi
  // (gom canh ma giam gia va CTA), lan sau mat 24 canh — video 6,5s thay vi 29,4s.
  // Ca hai lan chi lo ra vi co nguoi ngoi do lai bang ffprobe.
  //
  // Nen: do chinh tep vua giao. Hinh phai phu het tieng. Thieu la NEM LOI, va
  // thu muc tam duoc giu lai de con soi.
  const kiemHinh = await docSoKhung(raTep, viec)
  const daiHinh = kiemHinh / FPS
  if (coTieng) {
    const daiTieng = await docThoiLuongTiengGiay(raTep, viec)
    if (daiTieng !== null && daiHinh < daiTieng - 0.35) {
      throw new Error(
        `Track hinh chi dai ${daiHinh.toFixed(2)}s trong khi tieng dai ${daiTieng.toFixed(2)}s — ` +
        `video BI CAT CUT, ${(daiTieng - daiHinh).toFixed(2)}s cuoi khong co hinh. ` +
        `Thu muc tam da duoc giu lai o ${path.relative(root, viec)} de soi (xem chuoi-noi.txt).`
      )
    }
  }

  const raDich = path.join(root, 'out', raTep)
  fs.mkdirSync(path.dirname(raDich), { recursive: true })
  fs.copyFileSync(path.join(viec, raTep), raDich)
  const kb = (fs.statSync(raDich).size / 1024).toFixed(0)
  ok(`Xong: out/${raTep} (${kb} KB) · hinh ${daiHinh.toFixed(2)}s`)

  // ── Don rac ──────────────────────────────────────────────────────
  //
  // Mot lan dung de lai ~20 MB trong `.scratch/video-job`: moi canh mot tep MP4
  // rieng, cong anh da tai, cac doan tieng, cac tep chu, ban font, va ban hinh
  // chua ghep tieng. Dung 20 deal la 400 MB nam im tren o cung.
  //
  // ⚠️ CHI DON KHI XONG XUOI. Hong o giua thi GIU LAI — chinh mo tep do la thu
  // da tim ra loi cat cut video ngay 23/08: phai do do dai tung `doan-i.mp4`
  // moi thay `mocScene` lech. Don sach khi that bai la vut di bang chung duy nhat.
  //
  // ⚠️ KHONG dung toi `.scratch/tts-cache` — bo nho dem giong doc nam o do, va
  // xoa no la moi lan dung lai deu ton tien ElevenLabs.
  if (process.env.GIU_RAC) {
    info(`Giu lai ${path.relative(root, viec)} vi GIU_RAC=1`)
  } else {
    const mb = (docCoThuMuc(viec) / 1048576).toFixed(1)
    fs.rmSync(viec, { recursive: true, force: true })
    ok(`Da don ${mb} MB tep tam (dat GIU_RAC=1 de giu lai khi can soi loi)`)
  }

  console.log(`\n  Mo bang: start "" "${raDich}"\n`)
}

/** Tong so byte cua mot thu muc, tinh ca thu muc con. */
function docCoThuMuc(thuMuc) {
  let n = 0
  for (const m of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, m.name)
    n += m.isDirectory() ? docCoThuMuc(p) : fs.statSync(p).size
  }
  return n
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

/**
 * Hoi ffprobe do dai THAT cua mot doan da ma hoa.
 *
 * ⚠️ Bat buoc phai hoi, KHONG duoc tin con so `duration` trong kich ban.
 * ffmpeg ma hoa theo KHUNG HINH: `-t 1.3` o 30fps dang le ra 39 khung, nhung
 * `1.3 * 30` trong so thuc la 39.000000000000007 nen no lam tron len 40 khung
 * = 1,3333 giay. Moi canh du ra vai phan tram giay, hai muoi ba canh thi lech
 * gan nua giay — va cai lech do lam `xfade` vut khung, cat cut ca doan cuoi
 * video. Xem chu thich o buoc noi.
 */
/** Do dai track TIENG, giay. `null` neu tep khong co tieng. */
function docThoiLuongTiengGiay(tep, cwd) {
  return new Promise((res, rej) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-select_streams', 'a:0',
      '-show_entries', 'stream=duration', '-of', 'csv=p=0', tep,
    ], { cwd })
    let ra = ''
    p.stdout.on('data', d => { ra += d })
    p.on('error', rej)
    p.on('close', () => {
      const so = Number(String(ra).trim().replace(/,+$/, ''))
      res(Number.isFinite(so) && so > 0 ? so : null)
    })
  })
}

function docSoKhung(tep, cwd) {
  return new Promise((res, rej) => {
    // `-count_frames` dem THAT tung khung thay vi tin `nb_frames` trong header:
    // vai bo ma hoa ghi thieu hoac bo trong o do, va mot con so sai o day lam
    // lech ca dong thoi gian.
    const p = spawn('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-count_frames',
      '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', tep,
    ], { cwd })
    let ra = ''
    p.stdout.on('data', d => { ra += d })
    p.on('error', rej)
    p.on('close', ma => {
      const so = Number(String(ra).trim().replace(/,+$/, ''))
      if (ma !== 0 || !Number.isInteger(so) || so <= 0) {
        return rej(new Error(`ffprobe khong dem duoc so khung: ${tep}`))
      }
      res(so)
    })
  })
}

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


// ── Phu de chay: mot dong nhieu chu, chu dang doc thi noi len ──────
//
// ⚠️ VI SAO LA ASS CHU KHONG PHAI `drawtext`: de to sang mot chu NAM TRONG mot
// dong thi phai biet chu do bat dau o toa do x nao, tuc phai do be rong tung chu
// bang CHINH font se ve. `drawtext` khong tra ve be rong, va `chiaDong()` chi
// uoc luong `0,55 x co chu` moi ky tu — sai vai chuc pixel khi cong don, du de
// cac manh chu chong len nhau hoac ho ra. libass dan chu bang chinh font do nen
// viec do thanh mien phi: ta chi viet ra chu, no lo phan hinh hoc.
//
// ⚠️ VA VE TREN DONG THOI GIAN CUOI CUNG, khong ve tung doan roi moi noi: mot
// chu nam vat qua hai canh se bi cat lam doi neu ve theo doan.

/** Giay -> `0:00:01.23` cua ASS. */
function gioAss(giay) {
  const g = Math.max(0, giay)
  const h = Math.floor(g / 3600)
  const p = Math.floor((g % 3600) / 60)
  const s = g % 60
  return `${h}:${String(p).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
}

/**
 * Gom chu thanh tung DONG.
 *
 * Cat theo so KY TU chu khong theo so tu: "a" va "extraordinary" khong the tinh
 * ngang nhau. `toiDa` la so ky tu uoc chung mot dong chua duoc o co chu dang dung.
 */
function gomDong(tu, toiDa) {
  const dong = []
  let hienTai = []
  let dai = 0
  for (const w of tu) {
    const them = w.chu.length + (hienTai.length ? 1 : 0)
    if (hienTai.length && dai + them > toiDa) { dong.push(hienTai); hienTai = []; dai = 0 }
    hienTai.push(w)
    dai += w.chu.length + (hienTai.length > 1 ? 1 : 0)
  }
  if (hienTai.length) dong.push(hienTai)
  return dong
}

/**
 * Chu trong o Text cua ASS: bo `{` `}` (do la cu phap the cua ASS) va xuong dong.
 *
 * ⚠️ PHAI la `function`, khong duoc la `const`. `main()` chay o cap cao nhat cua
 * module nen no goi ham nay TRUOC khi cac `const` cuoi file kip khoi tao — dung
 * cai bay da ghi o dau file. Da mac lai lan nay: "Cannot access 'chuAss' before
 * initialization" ngay dong phu de dau tien.
 */
function chuAss(t) {
  return String(t).replace(/[{}]/g, '').replace(/\r?\n/g, ' ').trim()
}

/**
 * Sinh tep ASS cho ca video.
 *
 * `cacNhip` = [{ batDau, tu: [{chu, dau, het}] }] voi `batDau` la moc cua nhip do
 * tren dong thoi gian cuoi cung, con `dau`/`het` tinh tu dau nhip.
 */
function phuDeAss(cacNhip, { W, H, coChu, cachDay }) {
  // ⚠️ To sang bang MAU va bang chieu cao, TUYET DOI khong bang chieu ngang:
  // `\fscx` lam dong chu rong ra, ma dong dang can giua nen ca dong se nhay sang
  // trai mot chut moi lan doi chu — nhin nhu chu bi rung. `\fscy` chi lam chu
  // cao them, be ngang khong doi, nen dong dung yen.
  const NOI_CAO = 116
  const MAU_NOI = '&H0034CBF9&'   // ABGR — vang cam
  const dau = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${W}`,
    `PlayResY: ${H}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment 2 = duoi, can giua. Vien day de chu doc duoc khi de len anh sang.
    `Style: PD,Segoe UI,${coChu},&H00FFFFFF&,&H00FFFFFF&,&H00000000&,&H00000000&,-1,0,0,0,100,100,0,0,1,${Math.max(3, Math.round(coChu * 0.09))},0,2,90,90,${cachDay},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]

  const dong = []
  for (const nhip of cacNhip) {
    if (!nhip.tu?.length) continue
    // ~26 ky tu mot dong o co chu 62 tren khung 1080 — de libass tu xuong dong
    // neu lo qua, `WrapStyle: 2` khong tu can lai nen ta chu dong cat truoc.
    for (const d of gomDong(nhip.tu, 26)) {
      for (let k = 0; k < d.length; k++) {
        const w = d[k]
        // Moi chu mot su kien: ca dong hien nguyen, chi doi chu duoc to sang.
        // Nho vay dong chu dung yen con diem sang chay qua tung chu.
        const chu = d.map((x, j) => (j === k
          ? `{\\c${MAU_NOI}\\fscy${NOI_CAO}}${chuAss(x.chu)}{\\r}`
          : chuAss(x.chu))).join(' ')
        const tu0 = nhip.batDau + w.dau
        const tu1 = nhip.batDau + w.het
        if (tu1 - tu0 < 0.02) continue
        dong.push(`Dialogue: 0,${gioAss(tu0)},${gioAss(tu1)},PD,,0,0,0,,${chu}`)
      }
    }
  }
  return [...dau, ...dong].join('\n') + '\n'
}
